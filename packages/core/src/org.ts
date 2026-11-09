import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { Role } from "@veyra/contracts";
import { hashPassword, generateTemporaryPassword } from "@veyra/auth";
import type { VeyraDb } from "@veyra/database";
import {
  auditEvents,
  memberships,
  matters,
  organisations,
  users
} from "@veyra/database";
import { assertPermission, visibleMatterCondition } from "./access";
import { recordAudit } from "./audit";
import { conflict, forbidden, notFound, validation } from "./errors";
import type { Actor, DbExecutor } from "./types";

export interface OrganisationProfile {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  matterNumberPrefix: string;
  financialYearStartMonth: number;
}

export interface MemberRow {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  title: string | null;
  lastLoginAt: string | null;
  joinedAt: string;
}

export interface AuditRow {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  matterId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function getOrganisation(db: DbExecutor, actor: Actor): Promise<OrganisationProfile> {
  const rows = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      slug: organisations.slug,
      timezone: organisations.timezone,
      matterNumberPrefix: organisations.matterNumberPrefix,
      financialYearStartMonth: organisations.financialYearStartMonth
    })
    .from(organisations)
    .where(and(eq(organisations.id, actor.organisationId), isNull(organisations.archivedAt)))
    .limit(1);

  const organisation = rows[0];
  if (!organisation) throw notFound("Firm not found");
  return organisation;
}

export async function listMembers(db: DbExecutor, actor: Actor): Promise<MemberRow[]> {
  assertPermission(actor, "user:read");

  const rows = await db
    .select({
      membershipId: memberships.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
      status: memberships.status,
      title: memberships.title,
      lastLoginAt: users.lastLoginAt,
      joinedAt: memberships.joinedAt
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organisationId, actor.organisationId))
    .orderBy(asc(memberships.role), asc(users.name));

  return rows.map((row) => ({
    ...row,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    joinedAt: row.joinedAt.toISOString()
  }));
}

function assertCanAssignRole(actor: Actor, role: Role): void {
  if ((role === "owner" || role === "admin") && actor.role !== "owner") {
    throw forbidden("Only the firm owner can assign owner or administrator roles");
  }
}

export interface InviteMemberInput {
  name: string;
  email: string;
  role: Role;
  title: string | null;
}

export interface InviteMemberResult {
  membershipId: string;
  userId: string;
  /** Only returned for a newly created account, and displayed once. */
  temporaryPassword: string | null;
}

export async function inviteMember(
  db: VeyraDb,
  actor: Actor,
  input: InviteMemberInput
): Promise<InviteMemberResult> {
  assertPermission(actor, "user:manage");
  assertCanAssignRole(actor, input.role);

  const email = input.email.trim().toLowerCase();

  const existingUsers = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const existingUser = existingUsers[0];

  if (existingUser) {
    const existingMembership = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.organisationId, actor.organisationId),
          eq(memberships.userId, existingUser.id)
        )
      )
      .limit(1);
    if (existingMembership[0]) throw conflict("That person is already a member of this firm");
    if (!existingUser.isActive) throw conflict("That account is inactive. Contact support.");
  }

  const temporaryPassword = existingUser ? null : generateTemporaryPassword();
  const passwordHash = temporaryPassword ? await hashPassword(temporaryPassword) : null;

  return db.transaction(async (tx) => {
    let userId = existingUser?.id;
    if (!userId) {
      const inserted = await tx
        .insert(users)
        .values({
          email,
          name: input.name,
          passwordHash: passwordHash as string,
          mustChangePassword: true
        })
        .returning({ id: users.id });
      const user = inserted[0];
      if (!user) throw conflict("Could not create the account");
      userId = user.id;
    }

    const insertedMembership = await tx
      .insert(memberships)
      .values({
        organisationId: actor.organisationId,
        userId,
        role: input.role,
        title: input.title
      })
      .returning({ id: memberships.id });

    const membership = insertedMembership[0];
    if (!membership) throw conflict("Could not add the member");

    await recordAudit(tx, actor, {
      action: "user.invited",
      entityType: "membership",
      entityId: membership.id,
      metadata: { userId, email, role: input.role, newAccount: temporaryPassword !== null }
    });

    return { membershipId: membership.id, userId, temporaryPassword };
  });
}

export async function updateMemberRole(
  db: VeyraDb,
  actor: Actor,
  membershipId: string,
  role: Role
): Promise<void> {
  assertPermission(actor, "user:manage");
  assertCanAssignRole(actor, role);

  const rows = await db
    .select({
      membershipId: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      name: users.name
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.id, membershipId),
        eq(memberships.organisationId, actor.organisationId)
      )
    )
    .limit(1);
  const target = rows[0];
  if (!target) throw notFound("Team member not found");

  if (target.userId === actor.userId) {
    throw forbidden("You cannot change your own role");
  }
  if (target.role === role) return;

  if (target.role === "owner") {
    const ownerCountRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(
        and(
          eq(memberships.organisationId, actor.organisationId),
          eq(memberships.role, "owner")
        )
      );
    if ((ownerCountRows[0]?.count ?? 0) <= 1) {
      throw conflict("The firm must keep at least one owner");
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(memberships)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(memberships.id, membershipId),
          eq(memberships.organisationId, actor.organisationId)
        )
      );

    await recordAudit(tx, actor, {
      action: "user.role_changed",
      entityType: "membership",
      entityId: membershipId,
      metadata: { userId: target.userId, fromRole: target.role, toRole: role }
    });
  });
}

export interface UpdateOrganisationInput {
  name: string;
  matterNumberPrefix: string;
  timezone: string;
  financialYearStartMonth: number;
}

export async function updateOrganisationSettings(
  db: VeyraDb,
  actor: Actor,
  input: UpdateOrganisationInput
): Promise<void> {
  assertPermission(actor, "org:manage");

  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: input.timezone }).format(new Date());
  } catch {
    throw validation("Choose a valid IANA time zone");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(organisations)
      .set({
        name: input.name,
        matterNumberPrefix: input.matterNumberPrefix,
        timezone: input.timezone,
        financialYearStartMonth: input.financialYearStartMonth,
        updatedAt: new Date()
      })
      .where(eq(organisations.id, actor.organisationId));

    await recordAudit(tx, actor, {
      action: "organisation.settings_updated",
      entityType: "organisation",
      entityId: actor.organisationId,
      metadata: {
        fields: ["name", "matterNumberPrefix", "timezone", "financialYearStartMonth"]
      }
    });
  });
}

export interface AuditFilters {
  entityType?: string;
  matterId?: string;
  limit?: number;
}

export async function listAuditEvents(
  db: DbExecutor,
  actor: Actor,
  filters: AuditFilters = {}
): Promise<AuditRow[]> {
  assertPermission(actor, "audit:read");

  const visibleMatterIds = db
    .select({ id: matters.id })
    .from(matters)
    .where(visibleMatterCondition(actor));

  const conditions = [
    eq(auditEvents.organisationId, actor.organisationId),
    or(isNull(auditEvents.matterId), inArray(auditEvents.matterId, visibleMatterIds))
  ];
  if (filters.entityType) conditions.push(eq(auditEvents.entityType, filters.entityType));
  if (filters.matterId) conditions.push(eq(auditEvents.matterId, filters.matterId));

  const rows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      matterId: auditEvents.matterId,
      actorName: users.name,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorUserId))
    .where(and(...conditions))
    .orderBy(desc(auditEvents.createdAt))
    .limit(filters.limit ?? 100);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString()
  }));
}
