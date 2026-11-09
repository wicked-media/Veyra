import { ensureDemoSeed } from "@veyra/core";
import { openDatabaseFromEnv, type DatabaseHandle, type VeyraDb } from "@veyra/database";

const globalForDatabase = globalThis as unknown as {
  __veyraDatabase?: Promise<DatabaseHandle>;
};

async function initialise(): Promise<DatabaseHandle> {
  const handle = await openDatabaseFromEnv();
  await handle.migrate();

  const isLocalDevelopment = process.env.NODE_ENV !== "production" && handle.kind === "pglite";
  if (isLocalDevelopment && process.env.VEYRA_AUTO_SEED !== "false") {
    try {
      const result = await ensureDemoSeed(handle.db);
      if (result.seeded) console.log("[veyra] demo firm seeded (Marlow & Finch Legal)");
    } catch (error) {
      console.error("[veyra] demo seed failed; continuing without demo data", error);
    }
  }

  console.log(`[veyra] database ready (${handle.kind})`);
  return handle;
}

export function getDatabaseHandle(): Promise<DatabaseHandle> {
  globalForDatabase.__veyraDatabase ??= initialise();
  return globalForDatabase.__veyraDatabase;
}

export async function getDb(): Promise<VeyraDb> {
  return (await getDatabaseHandle()).db;
}
