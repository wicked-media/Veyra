import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type {
  DocumentCategory,
  DocumentScanStatus,
  DocumentStatus
} from "@veyra/contracts";
import type { VeyraDb } from "@veyra/database";
import {
  documentChunks,
  documentVersions,
  documents,
  matters
} from "@veyra/database";
import { assertPermission, requireMatterAccess, visibleMatterCondition } from "./access";
import { recordAudit } from "./audit";
import type { DocumentScanner } from "./document-scanner";
import type { DocumentStorage } from "./document-storage";
import { conflict, forbidden, notFound, validation } from "./errors";
import type { Actor, DbExecutor } from "./types";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const MAX_SEARCH_TEXT = 120_000;
const MAX_CHUNKS = 120;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

export interface DocumentSummary {
  id: string;
  matterId: string;
  matterNumber: string;
  matterTitle: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  latestVersion: number;
  latestVersionId: string;
  versionCount: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: DocumentScanStatus;
  uploadedAt: string;
  updatedAt: string;
}

export interface DocumentVersionSummary {
  id: string;
  versionNumber: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  scanStatus: DocumentScanStatus;
  scanProvider: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface DocumentUploadInput {
  matterId: string;
  documentId?: string | undefined;
  title: string;
  description: string | null;
  category: DocumentCategory;
  bytes: Buffer;
  filename: string;
  mimeType: string;
}

export interface DocumentUploadResult {
  documentId: string;
  versionId: string;
  versionNumber: number;
  scanStatus: DocumentScanStatus;
}

export interface DocumentDownload {
  documentId: string;
  matterId: string;
  title: string;
  versionNumber: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
  extractedText: string | null;
}

interface AllowedType {
  extensions: readonly string[];
  signature?: (bytes: Buffer) => boolean;
  text: boolean;
}

const ALLOWED_TYPES: Record<string, AllowedType> = {
  "application/pdf": {
    extensions: [".pdf"],
    signature: (bytes) => bytes.subarray(0, 5).toString("latin1") === "%PDF-",
    text: false
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: [".docx"],
    signature: (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    text: false
  },
  "text/plain": { extensions: [".txt"], text: true },
  "text/markdown": { extensions: [".md"], text: true },
  "text/csv": { extensions: [".csv"], text: true },
  "image/png": {
    extensions: [".png"],
    signature: (bytes) =>
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    text: false
  },
  "image/jpeg": {
    extensions: [".jpg", ".jpeg"],
    signature: (bytes) => bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
    text: false
  }
};

export const ACCEPTED_DOCUMENT_TYPES = Object.keys(ALLOWED_TYPES);

export function sanitiseFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "document";
  const withoutControls = [...base]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
  const cleaned = withoutControls.replace(/[<>:"|?*]/g, "-").trim();
  if (!cleaned) return "document";
  return cleaned.slice(0, 200);
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

export function validateDocumentUpload(input: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
}): { filename: string; mimeType: string } {
  if (input.bytes.length === 0) throw validation("Choose a non-empty file");
  if (input.bytes.length > MAX_DOCUMENT_BYTES) {
    throw validation("Documents must be 20 MB or smaller");
  }

  const filename = sanitiseFilename(input.filename);
  const mimeType = input.mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const type = ALLOWED_TYPES[mimeType];
  if (!type) throw validation("Choose a PDF, DOCX, text, CSV or image file");
  if (!type.extensions.includes(extensionOf(filename))) {
    throw validation("The file extension does not match its declared type");
  }
  if (type.signature && !type.signature(input.bytes)) {
    throw validation("The file content does not match its declared type");
  }

  if (type.text) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(input.bytes);
    } catch {
      throw validation("Text documents must use UTF-8 encoding");
    }
    if (text.includes("\u0000")) throw validation("Text documents cannot contain binary data");
    const controlCount = [...text].filter((character) => {
      const code = character.charCodeAt(0);
      return code < 32 && character !== "\n" && character !== "\r" && character !== "\t";
    }).length;
    if (controlCount > text.length * 0.01) {
      throw validation("Text documents cannot contain binary control characters");
    }
  }

  return { filename, mimeType };
}

export function extractDocumentText(
  bytes: Buffer,
  mimeType: string
): { text: string | null; warning: string | null } {
  const type = ALLOWED_TYPES[mimeType];
  if (!type?.text) {
    return {
      text: null,
      warning: "Text extraction is available for text, Markdown and CSV files. OCR/PDF ingestion is not enabled."
    };
  }
  const text = bytes.toString("utf8").replace(/\r\n/g, "\n").trim();
  return { text, warning: null };
}

export function chunkDocumentText(text: string): string[] {
  const normalized = text.replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < normalized.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(normalized.length, offset + CHUNK_SIZE);
    const chunk = normalized.slice(offset, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    offset = Math.max(end - CHUNK_OVERLAP, offset + 1);
  }
  return chunks;
}

function matterFilter(matterId?: string) {
  return matterId ? eq(documents.matterId, matterId) : undefined;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listDocuments(
  db: DbExecutor,
  actor: Actor,
  filters: { q?: string; matterId?: string; status?: DocumentStatus | "all"; limit?: number } = {}
): Promise<DocumentSummary[]> {
  assertPermission(actor, "document:read");

  const conditions = [eq(documents.organisationId, actor.organisationId), visibleMatterCondition(actor)];
  const scopedMatter = matterFilter(filters.matterId);
  if (scopedMatter) conditions.push(scopedMatter);
  if (filters.status && filters.status !== "all") conditions.push(eq(documents.status, filters.status));
  if (filters.q) {
    const term = `%${escapeLike(filters.q)}%`;
    const search = or(
      ilike(documents.title, term),
      ilike(documents.searchText, term)
    );
    if (search) conditions.push(search);
  }

  const rows = await db
    .select({
      id: documents.id,
      matterId: documents.matterId,
      matterNumber: matters.matterNumber,
      matterTitle: matters.title,
      title: documents.title,
      description: documents.description,
      category: documents.category,
      status: documents.status,
      latestVersion: documents.latestVersion,
      latestVersionId: documentVersions.id,
      versionCount: sql<number>`(select count(*)::int from ${documentVersions} dv where dv.document_id = ${documents.id})`,
      filename: documentVersions.originalFilename,
      mimeType: documentVersions.mimeType,
      sizeBytes: documentVersions.sizeBytes,
      scanStatus: documentVersions.scanStatus,
      uploadedAt: documentVersions.createdAt,
      updatedAt: documents.updatedAt
    })
    .from(documents)
    .innerJoin(matters, eq(matters.id, documents.matterId))
    .innerJoin(
      documentVersions,
      and(
        eq(documentVersions.documentId, documents.id),
        eq(documentVersions.versionNumber, documents.latestVersion)
      )
    )
    .where(and(...conditions))
    .orderBy(desc(documents.updatedAt))
    .limit(filters.limit ?? 100);

  return rows.map((row) => ({
    ...row,
    uploadedAt: row.uploadedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function listMatterDocuments(
  db: DbExecutor,
  actor: Actor,
  matterId: string
): Promise<DocumentSummary[]> {
  await requireMatterAccess(db, actor, matterId, "document:read");
  return listDocuments(db, actor, { matterId, status: "all" });
}

export async function listDocumentVersions(
  db: DbExecutor,
  actor: Actor,
  documentId: string
): Promise<DocumentVersionSummary[]> {
  assertPermission(actor, "document:read");
  const documentRows = await db
    .select({ matterId: documents.matterId })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.organisationId, actor.organisationId)))
    .limit(1);
  const document = documentRows[0];
  if (!document) throw notFound("Document not found");
  await requireMatterAccess(db, actor, document.matterId, "document:read");

  const rows = await db
    .select({
      id: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      originalFilename: documentVersions.originalFilename,
      mimeType: documentVersions.mimeType,
      sizeBytes: documentVersions.sizeBytes,
      sha256: documentVersions.sha256,
      scanStatus: documentVersions.scanStatus,
      scanProvider: documentVersions.scanProvider,
      uploadedBy: documentVersions.uploadedBy,
      createdAt: documentVersions.createdAt
    })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.organisationId, actor.organisationId)
      )
    )
    .orderBy(desc(documentVersions.versionNumber));

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function uploadDocument(
  db: VeyraDb,
  actor: Actor,
  input: DocumentUploadInput,
  storage: DocumentStorage,
  scanner: DocumentScanner
): Promise<DocumentUploadResult> {
  assertPermission(actor, "document:upload");
  await requireMatterAccess(db, actor, input.matterId, "document:upload");

  const validated = validateDocumentUpload(input);
  if (input.documentId) {
    assertPermission(actor, "document:upload");
    const existing = await db
      .select({ id: documents.id, matterId: documents.matterId, status: documents.status })
      .from(documents)
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.organisationId, actor.organisationId)
        )
      )
      .limit(1);
    if (!existing[0]) throw notFound("Document not found");
    if (existing[0].matterId !== input.matterId) throw notFound("Document not found");
    if (existing[0].status === "archived") throw conflict("Archived documents cannot receive new versions");
  }

  const scan = await scanner.scan(input.bytes, validated.filename, validated.mimeType);
  if (scan.verdict !== "clean") {
    await recordAudit(db, actor, {
      action: "document.upload_rejected",
      entityType: "document",
      matterId: input.matterId,
      metadata: {
        filename: validated.filename,
        verdict: scan.verdict,
        provider: scan.provider
      }
    });
    throw validation(
      scan.verdict === "infected"
        ? "The file was quarantined by the malware scanner and was not saved"
        : "The malware scanner could not clear this file. It was not saved."
    );
  }

  const documentId = input.documentId ?? randomUUID();
  const versionId = randomUUID();
  const storageKey = `matters/${input.matterId}/documents/${documentId}/${versionId}`;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const extraction = extractDocumentText(input.bytes, validated.mimeType);
  const chunks = extraction.text ? chunkDocumentText(extraction.text) : [];
  const searchText = [
    input.title,
    input.description ?? "",
    validated.filename,
    extraction.text ?? ""
  ]
    .join("\n")
    .slice(0, MAX_SEARCH_TEXT);

  await storage.put(storageKey, input.bytes, validated.mimeType);

  try {
    const result = await db.transaction(async (tx) => {
      let versionNumber = 1;

      if (input.documentId) {
        const updated = await tx
          .update(documents)
          .set({
            title: input.title,
            description: input.description,
            category: input.category,
            latestVersion: sql`${documents.latestVersion} + 1`,
            searchText,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(documents.id, input.documentId),
              eq(documents.organisationId, actor.organisationId),
              eq(documents.matterId, input.matterId),
              eq(documents.status, "active")
            )
          )
          .returning({ latestVersion: documents.latestVersion });

        const row = updated[0];
        if (!row) throw notFound("Document not found");
        versionNumber = row.latestVersion;
      } else {
        await tx.insert(documents).values({
          id: documentId,
          organisationId: actor.organisationId,
          matterId: input.matterId,
          title: input.title,
          description: input.description,
          category: input.category,
          searchText,
          latestVersion: 1,
          createdBy: actor.userId
        });
      }

      await tx.insert(documentVersions).values({
        id: versionId,
        organisationId: actor.organisationId,
        documentId,
        versionNumber,
        storageKey,
        originalFilename: validated.filename,
        mimeType: validated.mimeType,
        sizeBytes: input.bytes.length,
        sha256,
        extractedText: extraction.text,
        scanStatus: "clean",
        scanProvider: scan.provider,
        scanDetail: scan.detail,
        uploadedBy: actor.userId
      });

      if (chunks.length > 0) {
        await tx.insert(documentChunks).values(
          chunks.map((content, ordinal) => ({
            organisationId: actor.organisationId,
            matterId: input.matterId,
            documentId,
            versionId,
            ordinal,
            content
          }))
        );
      }

      await recordAudit(tx, actor, {
        action: input.documentId ? "document.version_added" : "document.uploaded",
        entityType: "document",
        entityId: documentId,
        matterId: input.matterId,
        metadata: {
          filename: validated.filename,
          versionNumber,
          sizeBytes: input.bytes.length,
          sha256,
          scanProvider: scan.provider,
          extractedText: extraction.text !== null
        }
      });

      return { documentId, versionId, versionNumber, scanStatus: "clean" as const };
    });

    return result;
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function getDocumentDownload(
  db: DbExecutor,
  actor: Actor,
  versionId: string
): Promise<DocumentDownload> {
  assertPermission(actor, "document:read");

  const rows = await db
    .select({
      documentId: documents.id,
      matterId: documents.matterId,
      title: documents.title,
      versionNumber: documentVersions.versionNumber,
      filename: documentVersions.originalFilename,
      mimeType: documentVersions.mimeType,
      sizeBytes: documentVersions.sizeBytes,
      sha256: documentVersions.sha256,
      storageKey: documentVersions.storageKey,
      extractedText: documentVersions.extractedText,
      scanStatus: documentVersions.scanStatus
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .innerJoin(matters, eq(matters.id, documents.matterId))
    .where(
      and(
        eq(documentVersions.id, versionId),
        eq(documentVersions.organisationId, actor.organisationId),
        visibleMatterCondition(actor)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw notFound("Document not found");
  if (row.scanStatus !== "clean") {
    throw forbidden("This document is not available until its malware scan is clear");
  }

  return row;
}

export async function recordDocumentDownload(
  db: DbExecutor,
  actor: Actor,
  download: DocumentDownload
): Promise<void> {
  await recordAudit(db, actor, {
    action: "document.downloaded",
    entityType: "document",
    entityId: download.documentId,
    matterId: download.matterId,
    metadata: { versionNumber: download.versionNumber, sha256: download.sha256 }
  });
}

export async function archiveDocument(
  db: VeyraDb,
  actor: Actor,
  documentId: string
): Promise<void> {
  assertPermission(actor, "document:manage");
  const rows = await db
    .select({ id: documents.id, matterId: documents.matterId, status: documents.status })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.organisationId, actor.organisationId)))
    .limit(1);
  const document = rows[0];
  if (!document) throw notFound("Document not found");
  await requireMatterAccess(db, actor, document.matterId, "document:manage");
  if (document.status === "archived") return;

  await db.transaction(async (tx) => {
    await tx
      .update(documents)
      .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), eq(documents.organisationId, actor.organisationId)));
    await recordAudit(tx, actor, {
      action: "document.archived",
      entityType: "document",
      entityId: documentId,
      matterId: document.matterId
    });
  });
}
