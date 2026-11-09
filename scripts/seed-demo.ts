import { openDatabaseFromEnv } from "@veyra/database";
import { DEMO_EMAIL, DEMO_PASSWORD, ensureDemoSeed } from "@veyra/core";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demonstration data with NODE_ENV=production");
  }

  const handle = await openDatabaseFromEnv();
  try {
    await handle.migrate();
    const result = await ensureDemoSeed(handle.db);
    if (result.seeded) {
      console.log("Demo firm created (Marlow & Finch Legal).");
      console.log(`Sign in with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    } else {
      console.log("A firm already exists in this database; demo seed skipped.");
    }
  } finally {
    await handle.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
