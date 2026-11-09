import { auditEvents } from "@veyra/database";
import type { Actor, DbExecutor } from "./types";

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  matterId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an audit event as part of the caller's transaction. Mutations keep
 * the audit write in the same transaction so the record cannot diverge from
 * the change it describes.
 */
export async function recordAudit(
  db: DbExecutor,
  actor: Pick<Actor, "organisationId" | "userId" | "ip" | "userAgent">,
  input: AuditInput
): Promise<void> {
  await db.insert(auditEvents).values({
    organisationId: actor.organisationId,
    actorUserId: actor.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    matterId: input.matterId ?? null,
    metadata: input.metadata ?? {},
    ip: actor.ip,
    userAgent: actor.userAgent
  });
}
