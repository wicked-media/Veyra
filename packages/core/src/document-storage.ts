import fs from "node:fs/promises";
import path from "node:path";

export interface DocumentStorage {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;

/**
 * Local, private document store for development and single-host evaluation.
 * Files live outside the web root, have restrictive permissions and are only
 * reachable through an authorised application route. Production should supply
 * a durable private object-store adapter with encryption and versioning.
 */
export class LocalDocumentStorage implements DocumentStorage {
  readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    if (!SAFE_KEY.test(key) || key.includes("..")) {
      throw new Error("Invalid document storage key");
    }
    const full = path.resolve(this.root, key);
    if (!full.startsWith(`${this.root}${path.sep}`)) {
      throw new Error("Document storage key escaped the storage root");
    }
    return full;
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
    await fs.writeFile(full, bytes, { mode: 0o600, flag: "wx" });
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(this.resolve(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
