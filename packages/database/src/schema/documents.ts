import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { users } from "./identity";
import { matters } from "./matters";
import { organisations } from "./tenancy";

export const documentCategory = pgEnum("document_category", [
  "general",
  "correspondence",
  "court",
  "contract",
  "evidence",
  "advice",
  "template",
  "other"
]);

export const documentStatus = pgEnum("document_status", ["active", "archived"]);

/**
 * `pending` and `failed` documents are quarantined: they can be listed by
 * authorised users but cannot be downloaded until a scanner marks them clean.
 */
export const documentScanStatus = pgEnum("document_scan_status", [
  "pending",
  "clean",
  "infected",
  "failed"
]);

/**
 * The logical document. Versions are immutable; the document row only tracks
 * which version is current and a denormalised search body for fast filtering.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: documentCategory("category").notNull().default("general"),
    status: documentStatus("status").notNull().default("active"),
    /** Starts at 1; incremented atomically when a new version is uploaded. */
    latestVersion: integer("latest_version").notNull().default(1),
    /** Title, description, filename and extracted text, for authorised search. */
    searchText: text("search_text").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true })
  },
  (table) => [
    index("documents_org_matter_idx").on(table.organisationId, table.matterId),
    index("documents_org_status_idx").on(table.organisationId, table.status),
    index("documents_org_updated_idx").on(table.organisationId, table.updatedAt)
  ]
);

/**
 * Immutable document version. Storage keys are generated server-side and are
 * never exposed as public URLs. `extractedText` is only populated for formats
 * the server can safely read; binary formats remain searchable by metadata
 * until the ingestion pipeline adds OCR.
 */
export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    extractedText: text("extracted_text"),
    scanStatus: documentScanStatus("scan_status").notNull().default("pending"),
    scanProvider: text("scan_provider"),
    scanDetail: text("scan_detail"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("document_versions_document_version_uq").on(
      table.documentId,
      table.versionNumber
    ),
    uniqueIndex("document_versions_storage_key_uq").on(table.storageKey),
    index("document_versions_org_document_idx").on(table.organisationId, table.documentId)
  ]
);

/**
 * Matter-scoped retrieval chunks. Chunks carry the matter id themselves so
 * retrieval can never accidentally query across matters.
 */
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => documentVersions.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("document_chunks_version_ordinal_uq").on(table.versionId, table.ordinal),
    index("document_chunks_org_matter_idx").on(table.organisationId, table.matterId),
    index("document_chunks_document_idx").on(table.documentId)
  ]
);

export type DocumentCategory = (typeof documentCategory.enumValues)[number];
export type DocumentStatus = (typeof documentStatus.enumValues)[number];
export type DocumentScanStatus = (typeof documentScanStatus.enumValues)[number];
