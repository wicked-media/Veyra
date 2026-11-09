/**
 * Veyra background worker.
 *
 * Stage 1 scope: session hygiene only. It does not process documents, send
 * email, post trust transactions or call an AI provider. Keeping a separate
 * process boundary from day one lets those jobs move here without changing
 * request-path behaviour.
 */
import { loadWorkerConfig } from "@veyra/config";
import { deleteExpiredSessions, openDatabaseFromEnv } from "@veyra/database";

async function main(): Promise<void> {
  const { intervalMs } = loadWorkerConfig();
  const handle = await openDatabaseFromEnv();
  await handle.migrate();

  let stopping = false;
  const state: { timer?: NodeJS.Timeout } = {};

  const runOnce = async (): Promise<void> => {
    const startedAt = new Date().toISOString();
    try {
      const removed = await deleteExpiredSessions(handle.db);
      console.log(
        JSON.stringify({
          level: "info",
          job: "delete-expired-sessions",
          removed,
          startedAt,
          finishedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          job: "delete-expired-sessions",
          message: error instanceof Error ? error.message : "Unknown error",
          startedAt
        })
      );
    }
  };

  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    if (state.timer) clearInterval(state.timer);
    console.log(JSON.stringify({ level: "info", event: "shutdown", signal }));
    await handle.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  console.log(
    JSON.stringify({
      level: "info",
      event: "worker_started",
      database: handle.kind,
      intervalMs
    })
  );

  await runOnce();
  state.timer = setInterval(() => void runOnce(), intervalMs);
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: "fatal",
      message: error instanceof Error ? error.message : "Unknown error"
    })
  );
  process.exitCode = 1;
});
