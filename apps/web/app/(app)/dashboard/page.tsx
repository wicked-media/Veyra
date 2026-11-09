import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CheckSquare,
  FolderClosed,
  ShieldCheck,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, StatCard } from "@veyra/ui";
import { getDashboard } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { dueLabel, formatLongDate, formatRelative, greeting, humaniseAction } from "@/lib/format";
import { LinkButton } from "@/components/link-button";
import { MatterStatusBadge, TaskPriorityBadge } from "@/components/status-badge";
import { TaskCompleteForm } from "@/components/task-complete-form";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; password?: string }>;
}) {
  const session = await requireAppSession();
  const data = await getDashboard(await getDb(), session.actor);
  const params = await searchParams;

  const firstName = session.actor.name.split(/\s+/)[0] ?? session.actor.name;
  const canCreateMatter = session.actor.permissions.includes("matter:create");
  const canCreateClient = session.actor.permissions.includes("client:create");
  const canCreateTask = session.actor.permissions.includes("task:create");
  const canReadTasks = session.actor.permissions.includes("task:read");
  const canReadAudit = session.actor.permissions.includes("audit:read");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={formatLongDate()}
        title={`${greeting()}, ${firstName}`}
        description="A live view of the firm's work, deadlines and recent activity."
        actions={
          <>
            {canCreateClient ? (
              <LinkButton href="/clients/new" variant="secondary">
                New client
              </LinkButton>
            ) : null}
            {canCreateMatter ? (
              <LinkButton href="/matters/new" variant="primary">
                New matter
              </LinkButton>
            ) : null}
          </>
        }
      />

      {params.password === "updated" ? (
        <div
          role="status"
          className="rounded-lg border border-positive/25 bg-positive/10 px-3.5 py-2.5 text-xs text-positive"
        >
          Your password has been updated. Other devices have been signed out.
        </div>
      ) : null}
      {params.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger"
        >
          {params.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open matters"
          value={data.counts.openMatters}
          detail="Visible to you"
          icon={<Briefcase className="size-4" aria-hidden />}
        />
        <StatCard
          label="Active clients"
          value={data.counts.activeClients}
          detail="Across the firm"
          icon={<Users className="size-4" aria-hidden />}
        />
        <StatCard
          label="Team members"
          value={data.counts.teamMembers}
          detail="Active memberships"
          icon={<FolderClosed className="size-4" aria-hidden />}
        />
        {canReadTasks ? (
          <StatCard
            label="My open tasks"
            value={data.counts.myOpenTasks}
            detail="Assigned to you"
            icon={<CheckSquare className="size-4" aria-hidden />}
          />
        ) : (
          <StatCard
            label="Audit trail"
            value="On"
            detail="Append-only firm history"
            icon={<ShieldCheck className="size-4" aria-hidden />}
          />
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Active matters</CardTitle>
              <Link
                href="/matters"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-500"
              >
                All matters <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </CardHeader>
            {data.recentMatters.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>Matter</th>
                      <th className="hidden md:table-cell">Client</th>
                      <th className="hidden lg:table-cell">Responsible</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentMatters.map((matter) => (
                      <tr key={matter.id}>
                        <td>
                          <Link href={`/matters/${matter.id}`} className="group block min-w-0">
                            <span className="block font-mono text-[10.5px] uppercase tracking-wider text-faint">
                              {matter.matterNumber}
                            </span>
                            <span className="mt-0.5 block truncate text-[13px] font-medium text-ink group-hover:text-teal-600">
                              {matter.title}
                            </span>
                          </Link>
                        </td>
                        <td className="hidden max-w-48 truncate text-muted md:table-cell">
                          {matter.clientName}
                        </td>
                        <td className="hidden text-muted lg:table-cell">{matter.responsibleName}</td>
                        <td>
                          <MatterStatusBadge status={matter.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardContent>
                <p className="text-sm text-muted">
                  No open matters yet.{" "}
                  {canCreateMatter ? (
                    <Link href="/matters/new" className="font-medium text-teal-600 hover:text-teal-500">
                      Open the firm&apos;s first matter
                    </Link>
                  ) : null}
                </p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              {canReadAudit ? (
                <Link href="/admin/audit" className="text-xs font-medium text-teal-600 hover:text-teal-500">
                  Audit log
                </Link>
              ) : null}
            </CardHeader>
            <CardContent className="pt-1">
              {data.activity.length > 0 ? (
                <ol className="relative space-y-4 border-l border-line pl-5">
                  {data.activity.map((event) => (
                    <li key={event.id} className="relative">
                      <span
                        className="absolute -left-[23px] top-1.5 size-1.5 rounded-full bg-teal-500 ring-4 ring-surface"
                        aria-hidden
                      />
                      <p className="text-[12.5px] font-medium text-ink">{humaniseAction(event.action)}</p>
                      <p className="mt-0.5 text-[11px] text-faint">
                        {event.actorName ?? "System"} · {formatRelative(event.createdAt)}
                        {event.matterId ? (
                          <>
                            {" · "}
                            <Link
                              href={`/matters/${event.matterId}`}
                              className="text-teal-600 hover:text-teal-500"
                            >
                              View matter
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-2 text-sm text-muted">No matter activity recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {canReadTasks ? (
            <Card>
              <CardHeader>
                <CardTitle>My tasks</CardTitle>
                <Link href="/tasks" className="text-xs font-medium text-teal-600 hover:text-teal-500">
                  All tasks
                </Link>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {data.myTasks.length > 0 ? (
                  data.myTasks.map((task) => {
                    const due = dueLabel(task.dueOn, data.today);
                    return (
                      <div key={task.id} className="rounded-lg border border-line px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12.5px] font-medium leading-snug text-ink">{task.title}</p>
                          <TaskPriorityBadge priority={task.priority} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-faint">
                          <span
                            className={
                              due.tone === "overdue"
                                ? "font-medium text-danger"
                                : due.tone === "today"
                                  ? "font-medium text-warning"
                                  : ""
                            }
                          >
                            {due.label}
                          </span>
                          {task.matterId ? (
                            <>
                              <span aria-hidden>·</span>
                              <Link
                                href={`/matters/${task.matterId}?tab=tasks`}
                                className="truncate text-teal-600 hover:text-teal-500"
                              >
                                {task.matterNumber}
                              </Link>
                            </>
                          ) : null}
                        </div>
                        <div className="mt-2">
                          <TaskCompleteForm taskId={task.id} status={task.status} redirectTo="/dashboard" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-2 text-sm text-muted">Nothing due in the next fortnight.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {canCreateMatter ? <LinkButton href="/matters/new">Open a matter</LinkButton> : null}
              {canCreateClient ? <LinkButton href="/clients/new">Add a client</LinkButton> : null}
              {canCreateTask ? <LinkButton href="/tasks">Create a task</LinkButton> : null}
              {canReadAudit ? <LinkButton href="/admin/audit">Review audit trail</LinkButton> : null}
              {!canCreateMatter && !canCreateClient && !canCreateTask ? (
                <p className="text-xs text-muted">
                  Your role has view access. Ask a firm administrator if you need to create records.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Tenant isolation", "Every query is scoped to your firm."],
                ["Ethical walls", "Walls override matter membership."],
                ["Immutable audit", "History cannot be edited or deleted."]
              ].map(([title, detail]) => (
                <div key={title} className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                  <div>
                    <p className="text-[12px] font-medium text-ink">{title}</p>
                    <p className="text-[11px] leading-relaxed text-muted">{detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
