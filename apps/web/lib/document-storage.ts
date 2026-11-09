import path from "node:path";
import {
  LocalDocumentStorage,
  createConfiguredDocumentScanner,
  type DocumentScanner,
  type DocumentStorage
} from "@veyra/core";
import { findRepositoryRoot } from "@veyra/database";

let storage: DocumentStorage | null = null;

/**
 * Local development uses `.data/documents` (gitignored). A deployment should
 * provide a durable private volume or replace this adapter with an encrypted
 * object-store implementation; the application never exposes a public URL.
 */
export function getDocumentStorage(): DocumentStorage {
  if (storage) return storage;
  const configured = process.env.VEYRA_DOCUMENT_DIR?.trim();
  const root = configured
    ? path.resolve(findRepositoryRoot(), configured)
    : path.join(findRepositoryRoot(), ".data", "documents");
  storage = new LocalDocumentStorage(root);
  return storage;
}

export function getDocumentScanner(): DocumentScanner {
  return createConfiguredDocumentScanner();
}
