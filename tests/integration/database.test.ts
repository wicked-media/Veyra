import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "@veyra/database";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "veyra-pglite-"));

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("embedded database startup", () => {
  it("creates missing parent directories for a fresh checkout", async () => {
    const directory = path.join(tempRoot, "missing", "pglite");
    expect(fs.existsSync(directory)).toBe(false);

    const handle = await createDatabase({ pgliteDir: directory });
    try {
      expect(fs.existsSync(directory)).toBe(true);
      await expect(handle.migrate()).resolves.toBeUndefined();
    } finally {
      await handle.close();
    }
  });
});
