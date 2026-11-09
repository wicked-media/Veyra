import { openDatabaseFromEnv } from "./client";

/**
 * Applies pending SQL migrations. Run explicitly as a deployment step; the
 * application server never migrates a production database on boot.
 */
async function main(): Promise<void> {
  const handle = await openDatabaseFromEnv();
  try {
    await handle.migrate();
    console.log(`Veyra migrations applied (${handle.kind}).`);
  } finally {
    await handle.close();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
