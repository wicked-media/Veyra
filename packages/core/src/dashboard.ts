import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { MatterSummary, TaskSummary } from "@veyra/contracts";
import { PRACTICE_AREA_LABELS, MATTER_STATUS_LABELS } from "@veyra/contracts";
import { hasPermission } from "@veyra/auth";
import {
  auditEvents,
  clients,
  memberships,
  matters,
  organisations,
  tasks,
  users
} from "@veyra/database";
import { assertPermission, visibleMatterCondition } from "./access";
import { listMatters } from "./matters";
import { visibleTaskCondition } from "./tasks";
import type { Actor, DbExecutor } from "./types";
import { notFound } from "./errors";

export interface DashboardData {
  today: string;
  counts: {
    openMatters: number;
    activeClients: number;
    teamMembers: number;
    myOpenTasks: number;
  };
  recentMatters: MatterSummary[];
  myTasks: TaskSummary[];
  activity: {
    id: number;
    action: string;
    actorName: string | null;
    matterId: string | null;
    createdAt: string;
  }[];
}

function todayInTimezone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function getDashboard(db: DbExecutor, actor: Actor): Promise<DashboardData> {
  assertPermission(actor, "matter:read");

  const orgRows = await db
    .select({ timezone: organisations.timezone })
    .from(organisations)
    .where(eq(organisations.id, actor.organisationId))
    .limit(1);
  const organisation = orgRows[0];
  if (!organisation) throw notFound("Firm not found");
  const today = todayInTimezone(organisation.timezone);

  const canViewTasks = hasPermission(actor.role, "task:read");
  const visibleMatterIds = db
    .select({ id: matters.id })
    .from(matters)
    .where(visibleMatterCondition(actor));

  const [
    openMattersRows,
    activeClientsRows,
    teamRows,
    myTaskCountRows,
    recentMatters,
    activityRows,
    myTasks
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(matters)
      .where(and(visibleMatterCondition(actor), eq(matters.status, "open"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(
        and(eq(clients.organisationId, actor.organisationId), eq(clients.status, "active"))
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(
        and(
          eq(memberships.organisationId, actor.organisationId),
          eq(memberships.status, "active")
        )
      ),
    canViewTasks
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(
            and(
              eq(tasks.organisationId, actor.organisationId),
              eq(tasks.assigneeUserId, actor.userId),
              inArray(tasks.status, ["todo", "in_progress"]),
              visibleTaskCondition(actor)
            )
          )
      : Promise.resolve([{ count: 0 }]),
    listMatters(db, actor, { status: "open", limit: 4 }),
    db
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        actorName: users.name,
        matterId: auditEvents.matterId,
        createdAt: auditEvents.createdAt
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorUserId))
      .where(
        and(
          eq(auditEvents.organisationId, actor.organisationId),
          inArray(auditEvents.matterId, visibleMatterIds)
        )
      )
      .orderBy(desc(auditEvents.createdAt))
      .limit(8),
    canViewTasks
      ? db
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
          .where(
            and(
              eq(tasks.organisationId, actor.organisationId),
              eq(tasks.assigneeUserId, actor.userId),
              inArray(tasks.status, ["todo", "in_progress"]),
              visibleTaskCondition(actor),
              isNull(tasks.completedAt),
              gte(tasks.dueOn, today),
              lte(tasks.dueOn, addDays(today, 14))
            )
          )
          .orderBy(tasks.dueOn)
          .limit(5)
      : Promise.resolve([])
  ]);

  return {
    today,
    counts: {
      openMatters: openMattersRows[0]?.count ?? 0,
      activeClients: activeClientsRows[0]?.count ?? 0,
      teamMembers: teamRows[0]?.count ?? 0,
      myOpenTasks: myTaskCountRows[0]?.count ?? 0
    },
    recentMatters,
    myTasks,
    activity: activityRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString()
    }))
  };
}

export interface InsightsData {
  totals: {
    matters: number;
    openMatters: number;
    closedMatters: number;
    activeClients: number;
  };
  practiceAreas: { label: string; count: number }[];
  statuses: { label: string; count: number }[];
  responsible: { name: string; count: number }[];
}

export async function getInsights(db: DbExecutor, actor: Actor): Promise<InsightsData> {
  assertPermission(actor, "report:read");
  assertPermission(actor, "matter:read");

  const [totalRows, activeClientRows, areaRows, statusRows, responsibleRows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${matters.status} = 'open')::int`,
        closed: sql<number>`count(*) filter (where ${matters.status} in ('closed','archived'))::int`
      })
      .from(matters)
      .where(visibleMatterCondition(actor)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(
        and(eq(clients.organisationId, actor.organisationId), eq(clients.status, "active"))
      ),
    db
      .select({ area: matters.practiceArea, count: sql<number>`count(*)::int` })
      .from(matters)
      .where(visibleMatterCondition(actor))
      .groupBy(matters.practiceArea),
    db
      .select({ status: matters.status, count: sql<number>`count(*)::int` })
      .from(matters)
      .where(visibleMatterCondition(actor))
      .groupBy(matters.status),
    db
      .select({ name: users.name, count: sql<number>`count(*)::int` })
      .from(matters)
      .innerJoin(users, eq(users.id, matters.responsibleUserId))
      .where(visibleMatterCondition(actor))
      .groupBy(users.name)
      .orderBy(sql`count(*) desc`)
      .limit(8)
  ]);

  const totals = totalRows[0] ?? { total: 0, open: 0, closed: 0 };

  return {
    totals: {
      matters: totals.total,
      openMatters: totals.open,
      closedMatters: totals.closed,
      activeClients: activeClientRows[0]?.count ?? 0
    },
    practiceAreas: areaRows
      .map((row) => ({ label: PRACTICE_AREA_LABELS[row.area], count: row.count }))
      .sort((a, b) => b.count - a.count),
    statuses: statusRows.map((row) => ({
      label: MATTER_STATUS_LABELS[row.status],
      count: row.count
    })),
    responsible: responsibleRows
  };
}
