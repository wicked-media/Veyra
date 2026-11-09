import { lt, sql } from "drizzle-orm";
import type { VeyraDb } from "./client";
import { sessions } from "./schema";

/**
 * Removes expired or revoked sessions. Safe to run periodically; the worker
 * invokes it on a fixed interval.
 */
/** Lightweight readiness probe. Does not expose schema or connection details. */
export async function checkDatabase(db: VeyraDb): Promise<void> {
  await db.execute(sql`select 1`);
}

export async function deleteExpiredSessions(db: VeyraDb, now = new Date()): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  return deleted.length;
}
