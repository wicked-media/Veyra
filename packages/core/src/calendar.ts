import { and, asc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import type {
  CalendarEventType,
  DeadlineCategory,
  DeadlineStatus,
  DeadlineVerification
} from "@veyra/contracts";
import type { VeyraDb } from "@veyra/database";
import {
  calendarEvents,
  deadlines,
  matterMembers,
  matters,
  matterWalls,
  users
} from "@veyra/database";
import { assertPermission, requireActiveMember, requireMatterAccess } from "./access";
import { recordAudit } from "./audit";
import { notFound } from "./errors";
import type { Actor, DbExecutor } from "./types";

export interface CalendarEventRow {
  id: string;
  matterId: string | null;
  matterNumber: string | null;
  matterTitle: string | null;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  assignedUserId: string | null;
  assignedName: string | null;
  createdAt: string;
}

export interface DeadlineRow {
  id: string;
  matterId: string;
  matterNumber: string;
  matterTitle: string;
  title: string;
  category: DeadlineCategory;
  dueOn: string;
  status: DeadlineStatus;
  verification: DeadlineVerification;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CalendarData {
  events: CalendarEventRow[];
  deadlines: DeadlineRow[];
  from: string | null;
  to: string | null;
}

function visibleEventCondition(actor: Actor): SQL {
  return sql`(
    ${calendarEvents.matterId} is null
    or exists (
      select 1 from ${matters} m
      where m.id = ${calendarEvents.matterId}
        and m.organisation_id = ${actor.organisationId}
        and (m.restricted = false or exists (
          select 1 from ${matterMembers} mm
          where mm.matter_id = m.id and mm.user_id = ${actor.userId}
        ))
        and not exists (
          select 1 from ${matterWalls} mw
          where mw.matter_id = m.id and mw.user_id = ${actor.userId}
        )
    )
  )`;
}

function visibleDeadlineCondition(actor: Actor): SQL {
  return sql`exists (
    select 1 from ${matters} m
    where m.id = ${deadlines.matterId}
      and m.organisation_id = ${actor.organisationId}
      and (m.restricted = false or exists (
        select 1 from ${matterMembers} mm
        where mm.matter_id = m.id and mm.user_id = ${actor.userId}
      ))
      and not exists (
        select 1 from ${matterWalls} mw
        where mw.matter_id = m.id and mw.user_id = ${actor.userId}
      )
  )`;
}

export interface CalendarFilters {
  from?: string;
  to?: string;
  matterId?: string;
  limit?: number;
}

export async function listCalendar(
  db: DbExecutor,
  actor: Actor,
  filters: CalendarFilters = {}
): Promise<CalendarData> {
  assertPermission(actor, "calendar:read");

  if (filters.matterId) {
    await requireMatterAccess(db, actor, filters.matterId, "calendar:read");
  }

  const eventConditions = [
    eq(calendarEvents.organisationId, actor.organisationId),
    visibleEventCondition(actor)
  ];
  const deadlineConditions = [
    eq(deadlines.organisationId, actor.organisationId),
    visibleDeadlineCondition(actor)
  ];
  if (filters.matterId) {
    eventConditions.push(eq(calendarEvents.matterId, filters.matterId));
    deadlineConditions.push(eq(deadlines.matterId, filters.matterId));
  }
  if (filters.from) {
    eventConditions.push(gte(calendarEvents.startsAt, new Date(`${filters.from}T00:00:00.000Z`)));
    deadlineConditions.push(gte(deadlines.dueOn, filters.from));
  }
  if (filters.to) {
    eventConditions.push(lte(calendarEvents.startsAt, new Date(`${filters.to}T23:59:59.999Z`)));
    deadlineConditions.push(lte(deadlines.dueOn, filters.to));
  }

  const [eventRows, deadlineRows] = await Promise.all([
    db
      .select({
        id: calendarEvents.id,
        matterId: calendarEvents.matterId,
        matterNumber: matters.matterNumber,
        matterTitle: matters.title,
        title: calendarEvents.title,
        description: calendarEvents.description,
        eventType: calendarEvents.eventType,
        startsAt: calendarEvents.startsAt,
        endsAt: calendarEvents.endsAt,
        allDay: calendarEvents.allDay,
        location: calendarEvents.location,
        assignedUserId: calendarEvents.assignedUserId,
        assignedName: users.name,
        createdAt: calendarEvents.createdAt
      })
      .from(calendarEvents)
      .leftJoin(matters, eq(matters.id, calendarEvents.matterId))
      .leftJoin(users, eq(users.id, calendarEvents.assignedUserId))
      .where(and(...eventConditions))
      .orderBy(asc(calendarEvents.startsAt))
      .limit(filters.limit ?? 200),
    db
      .select({
        id: deadlines.id,
        matterId: deadlines.matterId,
        matterNumber: matters.matterNumber,
        matterTitle: matters.title,
        title: deadlines.title,
        category: deadlines.category,
        dueOn: deadlines.dueOn,
        status: deadlines.status,
        verification: deadlines.verification,
        verifiedBy: deadlines.verifiedBy,
        verifiedByName: users.name,
        verifiedAt: deadlines.verifiedAt,
        notes: deadlines.notes,
        createdAt: deadlines.createdAt
      })
      .from(deadlines)
      .innerJoin(matters, eq(matters.id, deadlines.matterId))
      .leftJoin(users, eq(users.id, deadlines.verifiedBy))
      .where(and(...deadlineConditions))
      .orderBy(asc(deadlines.dueOn))
      .limit(filters.limit ?? 200)
  ]);

  return {
    events: eventRows.map((row) => ({
      ...row,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    })),
    deadlines: deadlineRows.map((row) => ({
      ...row,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    })),
    from: filters.from ?? null,
    to: filters.to ?? null
  };
}

export interface CreateCalendarEventInput {
  matterId: string | null;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  location: string | null;
  assignedUserId: string | null;
}

export async function createCalendarEvent(
  db: VeyraDb,
  actor: Actor,
  input: CreateCalendarEventInput
): Promise<{ id: string }> {
  assertPermission(actor, "calendar:create");
  if (input.matterId) {
    await requireMatterAccess(db, actor, input.matterId, "calendar:create");
  }
  if (input.assignedUserId) {
    await requireActiveMember(db, actor.organisationId, input.assignedUserId);
  }
  if (input.endsAt && input.endsAt <= input.startsAt) {
    throw new Error("The end time must be after the start time");
  }

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(calendarEvents)
      .values({
        organisationId: actor.organisationId,
        matterId: input.matterId,
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        location: input.location,
        assignedUserId: input.assignedUserId,
        createdBy: actor.userId
      })
      .returning({ id: calendarEvents.id });

    const event = inserted[0];
    if (!event) throw new Error("Calendar event insert returned no row");

    await recordAudit(tx, actor, {
      action: "calendar.event_created",
      entityType: "calendar_event",
      entityId: event.id,
      matterId: input.matterId,
      metadata: { title: input.title, startsAt: input.startsAt.toISOString() }
    });

    return event;
  });
}

export interface CreateDeadlineInput {
  matterId: string;
  title: string;
  category: DeadlineCategory;
  dueOn: string;
  notes: string | null;
}

export async function createDeadline(
  db: VeyraDb,
  actor: Actor,
  input: CreateDeadlineInput
): Promise<{ id: string }> {
  assertPermission(actor, "calendar:create");
  await requireMatterAccess(db, actor, input.matterId, "calendar:create");

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(deadlines)
      .values({
        organisationId: actor.organisationId,
        matterId: input.matterId,
        title: input.title,
        category: input.category,
        dueOn: input.dueOn,
        notes: input.notes,
        createdBy: actor.userId
      })
      .returning({ id: deadlines.id });

    const deadline = inserted[0];
    if (!deadline) throw new Error("Deadline insert returned no row");

    await recordAudit(tx, actor, {
      action: "deadline.created",
      entityType: "deadline",
      entityId: deadline.id,
      matterId: input.matterId,
      metadata: { title: input.title, dueOn: input.dueOn, category: input.category }
    });

    return deadline;
  });
}

export async function verifyDeadline(
  db: VeyraDb,
  actor: Actor,
  deadlineId: string
): Promise<void> {
  assertPermission(actor, "calendar:update");
  const rows = await db
    .select({
      id: deadlines.id,
      matterId: deadlines.matterId,
      verification: deadlines.verification
    })
    .from(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.organisationId, actor.organisationId)))
    .limit(1);
  const deadline = rows[0];
  if (!deadline) throw notFound("Deadline not found");
  await requireMatterAccess(db, actor, deadline.matterId, "calendar:update");
  if (deadline.verification === "verified") return;

  await db.transaction(async (tx) => {
    await tx
      .update(deadlines)
      .set({
        verification: "verified",
        verifiedBy: actor.userId,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(deadlines.id, deadlineId), eq(deadlines.organisationId, actor.organisationId)));

    await recordAudit(tx, actor, {
      action: "deadline.verified",
      entityType: "deadline",
      entityId: deadlineId,
      matterId: deadline.matterId
    });
  });
}

export async function updateDeadlineStatus(
  db: VeyraDb,
  actor: Actor,
  deadlineId: string,
  status: DeadlineStatus
): Promise<void> {
  assertPermission(actor, "calendar:update");
  const rows = await db
    .select({ id: deadlines.id, matterId: deadlines.matterId, status: deadlines.status })
    .from(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.organisationId, actor.organisationId)))
    .limit(1);
  const deadline = rows[0];
  if (!deadline) throw notFound("Deadline not found");
  await requireMatterAccess(db, actor, deadline.matterId, "calendar:update");
  if (deadline.status === status) return;

  await db.transaction(async (tx) => {
    await tx
      .update(deadlines)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(deadlines.id, deadlineId), eq(deadlines.organisationId, actor.organisationId)));
    await recordAudit(tx, actor, {
      action: "deadline.status_changed",
      entityType: "deadline",
      entityId: deadlineId,
      matterId: deadline.matterId,
      metadata: { fromStatus: deadline.status, toStatus: status }
    });
  });
}

/** Used by the calendar page to show a matter's dates in one query. */
export async function getMatterCalendar(
  db: DbExecutor,
  actor: Actor,
  matterId: string
): Promise<CalendarData> {
  await requireMatterAccess(db, actor, matterId, "calendar:read");
  return listCalendar(db, actor, { matterId });
}
