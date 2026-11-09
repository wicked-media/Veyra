import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select
} from "@veyra/ui";
import { listMatters, listMembers, listTasks } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { dueLabel, todayIsoDate } from "@/lib/format";
import { AccessDenied } from "@/components/access-denied";
import { TaskForm } from "@/components/forms/task-form";
import { TaskCompleteForm } from "@/components/task-complete-form";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; mine?: string; error?: string }>;
}) {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("task:read")) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Workspace" title="Tasks" />
        <AccessDenied description="Task lists are not part of your role. Matter leads can still assign you work; ask an administrator if you need access." />
      </div>
    );
  }

  const query = await searchParams;
  const db = await getDb();
  const statusOptions = ["open", "todo", "in_progress", "done", "all"] as const;
  const status = statusOptions.includes((query.status ?? "open") as (typeof statusOptions)[number])
    ? ((query.status ?? "open") as (typeof statusOptions)[number])
    : "open";
  const mine = query.mine === "true";

  const [tasks, members, matters] = await Promise.all([
    listTasks(db, session.actor, { status, mine, limit: 100 }),
    listMembers(db, session.actor),
    listMatters(db, session.actor, { status: "open", limit: 100 })
  ]);

  const canCreate = session.actor.permissions.includes("task:create");
  const today = todayIsoDate();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Tasks"
        description="Deadlines and work items across every matter you are allowed to see."
      />

      {query.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger"
        >
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <form method="get" action="/tasks" className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <label htmlFor="task-status-filter" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Status
                </label>
                <Select id="task-status-filter" name="status" defaultValue={status}>
                  <option value="open">Open (to do + in progress)</option>
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                  <option value="all">All</option>
                </Select>
              </div>
              <div className="pb-1">
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    name="mine"
                    value="true"
                    defaultChecked={mine}
                    className="size-4 rounded border-line accent-teal-500"
                  />
                  Assigned to me
                </label>
              </div>
              <button
                type="submit"
                className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong hover:bg-canvas"
              >
                Filter
              </button>
              <Link href="/tasks" className="pb-2.5 text-xs text-muted hover:text-ink">
                Clear
              </Link>
            </form>
          </Card>

          {tasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="size-5" aria-hidden />}
              title="No tasks match"
              description="Tasks carry the same access rules as their matter. A task on a restricted or walled matter will never appear outside that matter's team."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th className="hidden md:table-cell">Matter</th>
                      <th className="hidden lg:table-cell">Assigned</th>
                      <th>Due</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const due = dueLabel(task.dueOn, today);
                      return (
                        <tr key={task.id}>
                          <td className="max-w-64">
                            <p className="truncate text-[12.5px] font-medium text-ink">{task.title}</p>
                          </td>
                          <td className="hidden max-w-48 md:table-cell">
                            {task.matterId ? (
                              <Link
                                href={`/matters/${task.matterId}?tab=tasks`}
                                className="block truncate text-[11.5px] text-teal-600 hover:text-teal-500"
                              >
                                {task.matterNumber} · {task.matterTitle}
                              </Link>
                            ) : (
                              <span className="text-[11.5px] text-faint">Firm-level</span>
                            )}
                          </td>
                          <td className="hidden text-[11.5px] text-muted lg:table-cell">
                            {task.assigneeName ?? "Unassigned"}
                          </td>
                          <td className="whitespace-nowrap">
                            <span
                              className={
                                due.tone === "overdue"
                                  ? "text-[11.5px] font-medium text-danger"
                                  : due.tone === "today"
                                    ? "text-[11.5px] font-medium text-warning"
                                    : "text-[11.5px] text-muted"
                              }
                            >
                              {due.label}
                            </span>
                          </td>
                          <td>
                            <TaskPriorityBadge priority={task.priority} />
                          </td>
                          <td>
                            <TaskStatusBadge status={task.status} />
                          </td>
                          <td className="text-right">
                            <TaskCompleteForm taskId={task.id} status={task.status} redirectTo="/tasks" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {canCreate ? (
            <Card>
              <CardHeader>
                <CardTitle>Create a task</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskForm
                  members={members
                    .filter((member) => member.status === "active")
                    .map((member) => ({ userId: member.userId, name: member.name }))}
                  matters={matters.map((matter) => ({
                    id: matter.id,
                    matterNumber: matter.matterNumber,
                    title: matter.title
                  }))}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>How task access works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-[11.5px] leading-relaxed text-muted">
              <p>Tasks inherit the visibility of their matter.</p>
              <p>
                Firm-level tasks, with no matter attached, are visible to everyone with task access.
              </p>
              <div className="flex items-center gap-2 rounded-md border border-line bg-canvas/60 px-2.5 py-2">
                <Badge tone="amber">Important</Badge>
                <span>Ethical walls also hide associated tasks and activity.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
