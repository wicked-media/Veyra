import { and, eq, sql, type SQL } from "drizzle-orm";
import type { MatterStatus, Permission, PracticeArea } from "@veyra/contracts";
import { memberships, matters, matterMembers, matterWalls, users } from "@veyra/database";
import { hasPermission } from "@veyra/auth";
import { forbidden, notFound } from "./errors";
import type { Actor, DbExecutor } from "./types";

/**
 * The single source of matter visibility. It combines:
 *   1. tenant scope,
 *   2. ethical walls (deny always wins),
 *   3. restricted-matter team membership.
 *
 * Callers must separately check the org-level permission for the operation.
 */
export function visibleMatterCondition(actor: Actor): SQL {
  return and(
    eq(matters.organisationId, actor.organisationId),
    sql`not exists (
      select 1 from ${matterWalls} mw
      where mw.matter_id = ${matters.id} and mw.user_id = ${actor.userId}
    )`,
    sql`(
      ${matters.restricted} = false
      or exists (
        select 1 from ${matterMembers} mm
        where mm.matter_id = ${matters.id} and mm.user_id = ${actor.userId}
      )
    )`
  ) as SQL;
}

export function assertPermission(actor: Actor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) {
    throw forbidden();
  }
}

export interface MatterAccessRow {
  id: string;
  organisationId: string;
  clientId: string;
  matterNumber: string;
  title: string;
  description: string | null;
  practiceArea: PracticeArea;
  matterType: string | null;
  status: MatterStatus;
  stage: string | null;
  responsibleUserId: string;
  restricted: boolean;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

/**
 * Resolves a matter the actor is allowed to see, or throws NOT_FOUND.
 * Denied restricted/walled matters deliberately return 404 so their existence
 * is not disclosed.
 */
export async function requireMatterAccess(
  db: DbExecutor,
  actor: Actor,
  matterId: string,
  permission: Permission = "matter:read"
): Promise<MatterAccessRow> {
  assertPermission(actor, permission);

  const rows = await db
    .select({
      id: matters.id,
      organisationId: matters.organisationId,
      clientId: matters.clientId,
      matterNumber: matters.matterNumber,
      title: matters.title,
      description: matters.description,
      practiceArea: matters.practiceArea,
      matterType: matters.matterType,
      status: matters.status,
      stage: matters.stage,
      responsibleUserId: matters.responsibleUserId,
      restricted: matters.restricted,
      openedAt: matters.openedAt,
      closedAt: matters.closedAt,
      createdAt: matters.createdAt,
      updatedAt: matters.updatedAt,
      createdBy: matters.createdBy
    })
    .from(matters)
    .where(and(eq(matters.id, matterId), visibleMatterCondition(actor)))
    .limit(1);

  const matter = rows[0];
  if (!matter) throw notFound("Matter not found");

  return matter;
}

/** Ensures a user is an active member of the organisation before assignment. */
export async function requireActiveMember(
  db: DbExecutor,
  organisationId: string,
  userId: string
): Promise<{ userId: string; name: string; role: string }> {
  const rows = await db
    .select({ userId: users.id, name: users.name, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.organisationId, organisationId),
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
        eq(users.isActive, true)
      )
    )
    .limit(1);

  const member = rows[0];
  if (!member) throw forbidden("That person is not an active member of this firm");
  return member;
}
