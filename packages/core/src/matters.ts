import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type {
  MatterRole,
  MatterStatus,
  MatterSummary,
  PracticeArea,
  TaskSummary
} from "@veyra/contracts";
import { hasPermission } from "@veyra/auth";
import type { VeyraDb } from "@veyra/database";
import {
  auditEvents,
  clients,
  matterMembers,
  matterSequences,
  matters,
  matterParties,
  organisations,
  tasks,
  users
} from "@veyra/database";
import {
  assertPermission,
  requireActiveMember,
  requireMatterAccess,
  visibleMatterCondition
} from "./access";
import { recordAudit } from "./audit";
import { conflict, notFound } from "./errors";
import type { Actor, DbExecutor } from "./types";

export interface MatterListFilters {
  q?: string;
  status?: MatterStatus | "all";
  practiceArea?: PracticeArea;
  clientId?: string;
  limit?: number;
}

export interface MatterDetail {
  id: string;
  matterNumber: string;
  title: string;
  description: string | null;
  practiceArea: PracticeArea;
  matterType: string | null;
  status: MatterStatus;
  stage: string | null;
  restricted: boolean;
  responsibleUserId: string;
  openedAt: string;
  closedAt: string | null;
  updatedAt: string;
}

export interface MatterTeamMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  matterRole: MatterRole;
}

export interface MatterParty {
  id: string;
  name: string;
  role: string;
  organisation: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface MatterActivityItem {
  id: number;
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MatterWorkspace {
  matter: MatterDetail;
  client: { id: string; displayName: string; type: string; riskRating: string };
  responsible: { userId: string; name: string; email: string };
  members: MatterTeamMember[];
  parties: MatterParty[];
  tasks: TaskSummary[];
  activity: MatterActivityItem[];
  permissions: {
    canUpdate: boolean;
    canClose: boolean;
    canReopen: boolean;
    canManageAccess: boolean;
    canReadFinancials: boolean;
    canViewTasks: boolean;
    canCreateTasks: boolean;
  };
}

export interface CreateMatterResult {
  id: string;
  matterNumber: string;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function yearInTimezone(timeZone: string, now = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-AU", { timeZone, year: "numeric" }).format(now));
  } catch {
    return now.getUTCFullYear();
  }
}

export async function listMatters(
  db: DbExecutor,
  actor: Actor,
  filters: MatterListFilters = {}
): Promise<MatterSummary[]> {
  assertPermission(actor, "matter:read");

  const conditions = [visibleMatterCondition(actor)];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(matters.status, filters.status));
  }
  if (filters.practiceArea) {
    conditions.push(eq(matters.practiceArea, filters.practiceArea));
  }
  if (filters.clientId) {
    conditions.push(eq(matters.clientId, filters.clientId));
  }
  if (filters.q) {
    const term = `%${escapeLike(filters.q)}%`;
    const search = or(
      ilike(matters.title, term),
      ilike(matters.matterNumber, term),
      ilike(clients.displayName, term)
    );
    if (search) conditions.push(search);
  }

  const rows = await db
    .select({
      id: matters.id,
      matterNumber: matters.matterNumber,
      title: matters.title,
      status: matters.status,
      practiceArea: matters.practiceArea,
      clientId: matters.clientId,
      clientName: clients.displayName,
      responsibleName: users.name,
      restricted: matters.restricted,
      openedAt: matters.openedAt,
      updatedAt: matters.updatedAt
    })
    .from(matters)
    .innerJoin(clients, eq(clients.id, matters.clientId))
    .innerJoin(users, eq(users.id, matters.responsibleUserId))
    .where(and(...conditions))
    .orderBy(desc(matters.updatedAt))
    .limit(filters.limit ?? 50);

  return rows.map((row) => ({
    ...row,
    status: row.status,
    practiceArea: row.practiceArea,
    openedAt: row.openedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function getMatterWorkspace(
  db: DbExecutor,
  actor: Actor,
  matterId: string
): Promise<MatterWorkspace> {
  const matter = await requireMatterAccess(db, actor, matterId, "matter:read");

  const clientRows = await db
    .select({
      id: clients.id,
      displayName: clients.displayName,
      type: clients.type,
      riskRating: clients.riskRating
    })
    .from(clients)
    .where(and(eq(clients.id, matter.clientId), eq(clients.organisationId, actor.organisationId)))
    .limit(1);
  const client = clientRows[0];
  if (!client) throw notFound("Client not found");

  const responsibleRows = await db
    .select({ userId: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, matter.responsibleUserId))
    .limit(1);
  const responsible = responsibleRows[0];
  if (!responsible) throw notFound("Responsible solicitor not found");

  const teamRows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: matterMembers.role,
      membershipRole: sql<string>`(select role from memberships where memberships.user_id = ${users.id} and memberships.organisation_id = ${actor.organisationId} limit 1)`
    })
    .from(matterMembers)
    .innerJoin(users, eq(users.id, matterMembers.userId))
    .where(eq(matterMembers.matterId, matter.id))
    .orderBy(asc(matterMembers.createdAt));

  const partyRows = await db
    .select({
      id: matterParties.id,
      name: matterParties.name,
      role: matterParties.role,
      organisation: matterParties.organisation,
      email: matterParties.email,
      phone: matterParties.phone,
      notes: matterParties.notes
    })
    .from(matterParties)
    .where(eq(matterParties.matterId, matter.id))
    .orderBy(asc(matterParties.createdAt));

  const canViewTasks = hasPermission(actor.role, "task:read");
  const taskRows = canViewTasks
    ? await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          dueOn: tasks.dueOn,
          matterId: tasks.matterId,
          matterNumber: matters.matterNumber,
          matterTitle: matters.title,
          assigneeName: users.name,
          assigneeUserId: tasks.assigneeUserId
        })
        .from(tasks)
        .leftJoin(matters, eq(matters.id, tasks.matterId))
        .leftJoin(users, eq(users.id, tasks.assigneeUserId))
        .where(and(eq(tasks.matterId, matter.id), eq(tasks.organisationId, actor.organisationId)))
        .orderBy(asc(tasks.status), asc(tasks.dueOn), desc(tasks.createdAt))
    : [];

  const activityRows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      actorName: users.name,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorUserId))
    .where(and(eq(auditEvents.matterId, matter.id), eq(auditEvents.organisationId, actor.organisationId)))
    .orderBy(desc(auditEvents.createdAt))
    .limit(30);

  return {
    matter: {
      id: matter.id,
      matterNumber: matter.matterNumber,
      title: matter.title,
      description: matter.description,
      practiceArea: matter.practiceArea,
      matterType: matter.matterType,
      status: matter.status,
      stage: matter.stage,
      restricted: matter.restricted,
      responsibleUserId: matter.responsibleUserId,
      openedAt: matter.openedAt.toISOString(),
      closedAt: matter.closedAt?.toISOString() ?? null,
      updatedAt: matter.updatedAt.toISOString()
    },
    client,
    responsible,
    members: teamRows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.membershipRole,
      matterRole: row.role
    })),
    parties: partyRows,
    tasks: taskRows,
    activity: activityRows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString()
    })),
    permissions: {
      canUpdate: hasPermission(actor.role, "matter:update"),
      canClose: hasPermission(actor.role, "matter:close"),
      canReopen: hasPermission(actor.role, "matter:reopen"),
      canManageAccess: hasPermission(actor.role, "matter:manage_access"),
      canReadFinancials: hasPermission(actor.role, "matter:read_financials"),
      canViewTasks,
      canCreateTasks: hasPermission(actor.role, "task:create")
    }
  };
}

export async function createMatter(
  db: VeyraDb,
  actor: Actor,
  input: {
    clientId: string;
    title: string;
    description: string | null;
    practiceArea: PracticeArea;
    matterType: string | null;
    stage: string | null;
    responsibleUserId: string;
    restricted: boolean;
  }
): Promise<CreateMatterResult> {
  assertPermission(actor, "matter:create");

  const clientRows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), eq(clients.organisationId, actor.organisationId)))
    .limit(1);
  if (!clientRows[0]) throw notFound("Client not found");

  await requireActiveMember(db, actor.organisationId, input.responsibleUserId);

  const organisationRows = await db
    .select({
      timezone: organisations.timezone,
      matterNumberPrefix: organisations.matterNumberPrefix
    })
    .from(organisations)
    .where(eq(organisations.id, actor.organisationId))
    .limit(1);
  const organisation = organisationRows[0];
  if (!organisation) throw notFound("Firm not found");

  const year = yearInTimezone(organisation.timezone);

  return db.transaction(async (tx) => {
    const sequenceRows = await tx
      .insert(matterSequences)
      .values({ organisationId: actor.organisationId, year, lastValue: 1 })
      .onConflictDoUpdate({
        target: [matterSequences.organisationId, matterSequences.year],
        set: { lastValue: sql`${matterSequences.lastValue} + 1`, updatedAt: new Date() }
      })
      .returning({ lastValue: matterSequences.lastValue });

    const sequence = sequenceRows[0];
    if (!sequence) throw conflict("Could not allocate a matter number");

    const matterNumber = `${organisation.matterNumberPrefix}-${year}-${String(sequence.lastValue).padStart(4, "0")}`;

    const inserted = await tx
      .insert(matters)
      .values({
        organisationId: actor.organisationId,
        clientId: input.clientId,
        matterNumber,
        title: input.title,
        description: input.description,
        practiceArea: input.practiceArea,
        matterType: input.matterType,
        stage: input.stage,
        responsibleUserId: input.responsibleUserId,
        restricted: input.restricted,
        createdBy: actor.userId
      })
      .returning({ id: matters.id, matterNumber: matters.matterNumber });

    const matter = inserted[0];
    if (!matter) throw conflict("Could not open the matter");

    await tx.insert(matterMembers).values({
      organisationId: actor.organisationId,
      matterId: matter.id,
      userId: input.responsibleUserId,
      role: "lead"
    });

    if (input.responsibleUserId !== actor.userId) {
      await tx.insert(matterMembers).values({
        organisationId: actor.organisationId,
        matterId: matter.id,
        userId: actor.userId,
        role: "member"
      });
    }

    await recordAudit(tx, actor, {
      action: "matter.created",
      entityType: "matter",
      entityId: matter.id,
      matterId: matter.id,
      metadata: {
        matterNumber: matter.matterNumber,
        title: input.title,
        practiceArea: input.practiceArea,
        restricted: input.restricted
      }
    });

    return { id: matter.id, matterNumber: matter.matterNumber };
  });
}

export interface UpdateMatterInput {
  title?: string | undefined;
  description?: string | null | undefined;
  stage?: string | null | undefined;
  status?: MatterStatus | undefined;
  restricted?: boolean | undefined;
  responsibleUserId?: string | undefined;
}

export async function updateMatter(
  db: VeyraDb,
  actor: Actor,
  matterId: string,
  patch: UpdateMatterInput
): Promise<void> {
  const existing = await requireMatterAccess(db, actor, matterId, "matter:update");

  if (patch.restricted !== undefined && patch.restricted !== existing.restricted) {
    assertPermission(actor, "matter:manage_access");
  }

  if (patch.responsibleUserId && patch.responsibleUserId !== existing.responsibleUserId) {
    assertPermission(actor, "matter:manage_access");
    await requireActiveMember(db, actor.organisationId, patch.responsibleUserId);
  }

  if (patch.status && patch.status !== existing.status) {
    const wasClosed = existing.status === "closed" || existing.status === "archived";
    const willClose = patch.status === "closed" || patch.status === "archived";
    if (!wasClosed && willClose) assertPermission(actor, "matter:close");
    if (wasClosed && !willClose) assertPermission(actor, "matter:reopen");
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.stage !== undefined) update.stage = patch.stage;
  if (patch.restricted !== undefined) update.restricted = patch.restricted;
  if (patch.responsibleUserId !== undefined) update.responsibleUserId = patch.responsibleUserId;
  if (patch.status !== undefined) {
    update.status = patch.status;
    update.closedAt =
      patch.status === "closed" || patch.status === "archived" ? new Date() : null;
  }

  const changedFields = Object.keys(patch).filter((key) => patch[key as keyof UpdateMatterInput] !== undefined);

  await db.transaction(async (tx) => {
    await tx
      .update(matters)
      .set(update)
      .where(and(eq(matters.id, matterId), eq(matters.organisationId, actor.organisationId)));

    if (patch.responsibleUserId && patch.responsibleUserId !== existing.responsibleUserId) {
      await tx
        .insert(matterMembers)
        .values({
          organisationId: actor.organisationId,
          matterId,
          userId: patch.responsibleUserId,
          role: "lead"
        })
        .onConflictDoUpdate({
          target: [matterMembers.matterId, matterMembers.userId],
          set: { role: "lead", updatedAt: new Date() }
        });
    }

    await recordAudit(tx, actor, {
      action: patch.status && patch.status !== existing.status ? "matter.status_changed" : "matter.updated",
      entityType: "matter",
      entityId: matterId,
      matterId,
      metadata: {
        fields: changedFields,
        ...(patch.status ? { fromStatus: existing.status, toStatus: patch.status } : {})
      }
    });
  });
}

/** Loads a matter's parties without exposing a matter the actor cannot see. */
export async function listMatterParties(
  db: DbExecutor,
  actor: Actor,
  matterId: string
): Promise<MatterParty[]> {
  await requireMatterAccess(db, actor, matterId, "matter:read");
  return db
    .select({
      id: matterParties.id,
      name: matterParties.name,
      role: matterParties.role,
      organisation: matterParties.organisation,
      email: matterParties.email,
      phone: matterParties.phone,
      notes: matterParties.notes
    })
    .from(matterParties)
    .where(eq(matterParties.matterId, matterId))
    .orderBy(asc(matterParties.createdAt));
}
