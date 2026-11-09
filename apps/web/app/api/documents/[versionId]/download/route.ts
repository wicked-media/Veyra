import type { NextRequest } from "next/server";
import {
  getDocumentDownload,
  recordDocumentDownload,
  isAppError
} from "@veyra/core";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDocumentStorage } from "@/lib/document-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodedFilename(filename: string): string {
  return encodeURIComponent(filename).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ versionId: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response("Sign in to continue", { status: 401 });
  }

  const { versionId } = await context.params;
  try {
    const db = await getDb();
    const download = await getDocumentDownload(db, session.actor, versionId);
    const bytes = download.storageKey.startsWith("seed:")
      ? Buffer.from(download.extractedText ?? "", "utf8")
      : await getDocumentStorage().get(download.storageKey);

    await recordDocumentDownload(db, session.actor, download);

    const filename = download.filename.replace(/[\r\n"]/g, "_");
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": download.mimeType,
        "content-length": String(bytes.length),
        "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename(download.filename)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox"
      }
    });
  } catch (error) {
    if (isAppError(error)) {
      return new Response(error.message, {
        status: error.status,
        headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" }
      });
    }
    console.error("[veyra] document download failed", error);
    return new Response("The document could not be downloaded", {
      status: 500,
      headers: { "cache-control": "no-store" }
    });
  }
}
