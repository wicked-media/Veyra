import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { TaskPriority, TaskStatus, TaskSummary } from "@veyra/contracts";
import type { VeyraDb } from "@veyra/database";
import {
  matters,
  matterMembers,
  matterWalls,
  tasks,
  users
} from "@veyra/database";
import { assertPermission, requireActiveMember, requireMatterAccess } from "./access";
import { recordAudit } from "./audit";
import { notFound } from "./errors";
import type { Actor, DbExecutor } from "./types";

/**
 * Task visibility follows matter visibility. Org-level tasks (no matter) are
 * visible to everyone with task:read. A task on a walled or restricted matter
 * stays hidden.
 */
export function visibleTaskCondition(actor: Actor): SQL {
  return sql`(
    ${tasks.matterId} is null
    or exists (
      select 1 from ${matters} m
      where m.id = ${tasks.matterId}
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

export interface TaskListFilters {
  status?: TaskStatus | "open" | "all";
  mine?: boolean;
  limit?: number;
}

export async function listTasks(
  db: DbExecutor,
  actor: Actor,
  filters: TaskListFilters = {}
): Promise<TaskSummary[]> {
  assertPermission(actor, "task:read");

  const conditions = [eq(tasks.organisationId, actor.organisationId), visibleTaskCondition(actor)];

  const status = filters.status ?? "open";
  if (status === "open") {
    conditions.push(inArray(tasks.status, ["todo", "in_progress"]));
  } else if (status !== "all") {
    conditions.push(eq(tasks.status, status));
  }

  if (filters.mine) {
    conditions.push(eq(tasks.assigneeUserId, actor.userId));
  }

  return db
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
    .where(and(...conditions))
    .orderBy(asc(tasks.dueOn), desc(tasks.createdAt))
    .limit(filters.limit ?? 50);
}

export interface CreateTaskInput {
  title: string;
  description: string | null;
  matterId: string | null;
  assigneeUserId: string | null;
  priority: TaskPriority;
  dueOn: string | null;
}

export async function createTask(
  db: VeyraDb,
  actor: Actor,
  input: CreateTaskInput
): Promise<{ id: string }> {
  assertPermission(actor, "task:create");

  if (input.matterId) {
    await requireMatterAccess(db, actor, input.matterId, "task:create");
  }

  if (input.assigneeUserId) {
    await requireActiveMember(db, actor.organisationId, input.assigneeUserId);
  }

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(tasks)
      .values({
        organisationId: actor.organisationId,
        matterId: input.matterId,
        assigneeUserId: input.assigneeUserId ?? actor.userId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueOn: input.dueOn,
        createdBy: actor.userId
      })
      .returning({ id: tasks.id });

    const task = inserted[0];
    if (!task) throw new Error("Task insert returned no row");

    await recordAudit(tx, actor, {
      action: "task.created",
      entityType: "task",
      entityId: task.id,
      matterId: input.matterId,
      metadata: { title: input.title, priority: input.priority, dueOn: input.dueOn }
    });

    return task;
  });
}

export interface UpdateTaskInput {
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeUserId?: string | null | undefined;
  dueOn?: string | null | undefined;
}

export async function updateTask(
  db: VeyraDb,
  actor: Actor,
  taskId: string,
  patch: UpdateTaskInput
): Promise<void> {
  assertPermission(actor, "task:update");

  const rows = await db
    .select({
      id: tasks.id,
      organisationId: tasks.organisationId,
      matterId: tasks.matterId,
      status: tasks.status
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organisationId, actor.organisationId)))
    .limit(1);
  const existing = rows[0];
  if (!existing) throw notFound("Task not found");

  if (existing.matterId) {
    await requireMatterAccess(db, actor, existing.matterId, "task:update");
  }

  if (patch.assigneeUserId) {
    await requireActiveMember(db, actor.organisationId, patch.assigneeUserId);
  }

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.status !== undefined) {
    values.status = patch.status;
    values.completedAt = patch.status === "done" ? new Date() : null;
  }
  if (patch.priority !== undefined) values.priority = patch.priority;
  if (patch.assigneeUserId !== undefined) values.assigneeUserId = patch.assigneeUserId;
  if (patch.dueOn !== undefined) values.dueOn = patch.dueOn;

  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set(values)
      .where(and(eq(tasks.id, taskId), eq(tasks.organisationId, actor.organisationId)));

    await recordAudit(tx, actor, {
      action: patch.status === "done" ? "task.completed" : "task.updated",
      entityType: "task",
      entityId: taskId,
      matterId: existing.matterId,
      metadata: {
        fields: Object.keys(patch).filter((key) => patch[key as keyof UpdateTaskInput] !== undefined),
        ...(patch.status ? { fromStatus: existing.status, toStatus: patch.status } : {})
      }
    });
  });
}

export async function listMatterTasks(
  db: DbExecutor,
  actor: Actor,
  matterId: string
): Promise<TaskSummary[]> {
  assertPermission(actor, "task:read");
  await requireMatterAccess(db, actor, matterId, "task:read");

  return db
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
    .where(and(eq(tasks.matterId, matterId), eq(tasks.organisationId, actor.organisationId)))
    .orderBy(asc(tasks.dueOn), desc(tasks.createdAt));
}
