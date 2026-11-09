import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  FolderClosed,
  Landmark,
  Sparkles,
  Users
} from "lucide-react";
import {
  PRACTICE_AREA_LABELS,
  type MatterStatus
} from "@veyra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select
} from "@veyra/ui";
import {
  getMatterCalendar,
  getMatterWorkspace,
  isAppError,
  listAiThreads,
  listMatterDocuments,
  listMembers,
  listPendingAiProposals
} from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { dueLabel, formatDate, formatDateTime, formatRelative, humaniseAction, todayIsoDate } from "@/lib/format";
import { LinkButton } from "@/components/link-button";
import {
  MatterStatusBadge,
  TaskPriorityBadge,
  TaskStatusBadge
} from "@/components/status-badge";
import { TaskForm } from "@/components/forms/task-form";
import { TaskCompleteForm } from "@/components/task-complete-form";
import { updateMatterStatusAction } from "@/lib/actions/matters";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { CalendarSection } from "@/components/calendar/calendar-section";
import { AiProposalList } from "@/components/ai/proposal-list";

export const metadata: Metadata = { title: "Matter" };

const TAB_KEYS = ["overview", "parties", "tasks", "documents", "calendar", "activity", "billing", "ai"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default async function MatterPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const session = await requireAppSession();
  const { id } = await params;
  const query = await searchParams;
  const db = await getDb();

  const workspace = await getMatterWorkspace(db, session.actor, id).catch((error: unknown) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const { matter, client, responsible, members, parties, tasks, activity, permissions } = workspace;
  const requestedTab = (query.tab ?? "overview") as TabKey;
  const tab: TabKey = TAB_KEYS.includes(requestedTab) ? requestedTab : "overview";

  const canSeeDocuments = session.actor.permissions.includes("document:read");
  const canUploadDocuments = session.actor.permissions.includes("document:upload");
  const canManageDocuments = session.actor.permissions.includes("document:manage");
  const canSeeCalendar = session.actor.permissions.includes("calendar:read");
  const canCreateCalendar = session.actor.permissions.includes("calendar:create");
  const canUpdateCalendar = session.actor.permissions.includes("calendar:update");
  const canUseAi = session.actor.permissions.includes("ai:use");
  const canApproveAi = session.actor.permissions.includes("task:create");
  const canSeeFinancials = permissions.canReadFinancials;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "parties" as const, label: `Parties (${parties.length})` },
    ...(permissions.canViewTasks ? [{ key: "tasks" as const, label: `Tasks (${tasks.length})` }] : []),
    ...(canSeeDocuments ? [{ key: "documents" as const, label: "Documents" }] : []),
    ...(canSeeCalendar ? [{ key: "calendar" as const, label: "Calendar" }] : []),
    { key: "activity" as const, label: "Activity" },
    ...(canSeeFinancials ? [{ key: "billing" as const, label: "Billing" }] : []),
    ...(canUseAi ? [{ key: "ai" as const, label: "AI assistant" }] : [])
  ];

  const eligibleMembers = permissions.canViewTasks
    ? (await listMembers(db, session.actor))
        .filter((member) => member.status === "active")
        .map((member) => ({ userId: member.userId, name: member.name }))
    : [];

  const documents =
    tab === "documents" && canSeeDocuments
      ? await listMatterDocuments(db, session.actor, matter.id)
      : [];
  const calendarData =
    tab === "calendar" && canSeeCalendar
      ? await getMatterCalendar(db, session.actor, matter.id)
      : null;
  const aiThreads =
    tab === "ai" && canUseAi
      ? await listAiThreads(db, session.actor, { matterId: matter.id, limit: 10 })
      : [];
  const aiProposals =
    tab === "ai" && canUseAi
      ? await listPendingAiProposals(db, session.actor, { matterId: matter.id, limit: 10 })
      : [];

  return (
    <div className="space-y-6">
      {query.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger"
        >
          {query.error}
        </div>
      ) : null}

      <PageHeader
        eyebrow={`${matter.matterNumber} · ${PRACTICE_AREA_LABELS[matter.practiceArea]}${matter.matterType ? ` · ${matter.matterType}` : ""}`}
        title={matter.title}
        description={`Client: ${client.displayName} · Responsible: ${responsible.name}`}
        actions={
          <>
            {matter.restricted ? (
              <Badge tone="amber" dot>
                Restricted matter
              </Badge>
            ) : null}
            <MatterStatusBadge status={matter.status} />
            <LinkButton href="/matters" size="sm">
              Back to matters
            </LinkButton>
          </>
        }
      />

      <nav className="flex gap-1 overflow-x-auto border-b border-line pb-px" aria-label="Matter tabs">
        {tabs.map((entry) => (
          <Link
            key={entry.key}
            href={`/matters/${matter.id}?tab=${entry.key}`}
            aria-current={tab === entry.key ? "page" : undefined}
            className={
              tab === entry.key
                ? "whitespace-nowrap border-b-2 border-teal-500 px-3 py-2 text-[12.5px] font-medium text-ink"
                : "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[12.5px] font-medium text-muted hover:text-ink"
            }
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Matter overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-relaxed text-muted">
                  {matter.description ?? "No description has been recorded for this matter."}
                </p>
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Stage</dt>
                    <dd className="mt-1 text-[13px] text-ink">{matter.stage ?? "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Opened</dt>
                    <dd className="mt-1 text-[13px] text-ink">{formatDate(matter.openedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Client</dt>
                    <dd className="mt-1 text-[13px]">
                      <Link href={`/clients/${client.id}`} className="text-teal-600 hover:text-teal-500">
                        {client.displayName}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Client risk</dt>
                    <dd className="mt-1 text-[13px] capitalize text-ink">{client.riskRating}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Matter team</CardTitle>
                <span className="text-[11px] text-faint">{members.length} members</span>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">{member.name}</p>
                      <p className="truncate text-[11px] text-faint">{member.email}</p>
                    </div>
                    <Badge tone={member.matterRole === "lead" ? "teal" : "neutral"}>
                      {member.matterRole === "lead" ? "Matter lead" : member.matterRole}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parties</CardTitle>
                <Link href={`/matters/${matter.id}?tab=parties`} className="text-xs font-medium text-teal-600 hover:text-teal-500">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {parties.length === 0 ? (
                  <p className="text-sm text-muted">No parties recorded yet.</p>
                ) : (
                  parties.slice(0, 4).map((party) => (
                    <div key={party.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] text-ink">{party.name}</p>
                        {party.organisation ? (
                          <p className="truncate text-[11px] text-faint">{party.organisation}</p>
                        ) : null}
                      </div>
                      <Badge tone="neutral">{party.role.replace(/_/g, " ")}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
                <MatterStatusBadge status={matter.status} />
              </CardHeader>
              <CardContent>
                {permissions.canUpdate ? (
                  <form action={updateMatterStatusAction} className="space-y-3">
                    <input type="hidden" name="matterId" value={matter.id} />
                    <label htmlFor="matter-status-update" className="sr-only">
                      Matter status
                    </label>
                    <Select
                      id="matter-status-update"
                      name="matterStatus"
                      defaultValue={matter.status}
                      className="h-9 text-xs"
                    >
                      {(["open", "on_hold", "closed", "archived"] as MatterStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {status === "on_hold" ? "On hold" : status.replace(/^\w/, (c) => c.toUpperCase())}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" variant="secondary" size="sm" className="w-full">
                      Update status
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted">Your role cannot change matter status.</p>
                )}
                <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
                  Closing a matter records the date and writes an audit event. Reopening requires the
                  reopen permission.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access &amp; confidentiality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed text-muted">
                <div className="flex items-start gap-2.5">
                  <Users className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                  <p>
                    {matter.restricted
                      ? "Restricted: only members of this matter team can see it."
                      : "Firm-wide visibility, subject to role permissions."}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Landmark className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                  <p>Ethical walls override team membership and are enforced on every read and write.</p>
                </div>
                {permissions.canManageAccess ? (
                  <p className="rounded-md border border-dashed border-line px-2.5 py-2 text-[10.5px] text-faint">
                    Team and wall management UI arrives in Stage 2; the controls are already enforced
                    server-side.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Opened</span>
                  <span className="font-medium text-ink">{formatDate(matter.openedAt)}</span>
                </div>
                {matter.closedAt ? (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted">Closed</span>
                    <span className="font-medium text-ink">{formatDate(matter.closedAt)}</span>
                  </div>
                ) : null}
                <div className="mt-3 rounded-lg border border-dashed border-line px-3 py-2.5 text-[10.5px] leading-relaxed text-faint">
                  Court and limitation dates are recorded in the matter calendar. They remain
                  unverified until a qualified person confirms the source date.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "parties" ? (
        <Card>
          <CardHeader>
            <CardTitle>Parties and representatives</CardTitle>
            <span className="text-[11px] text-faint">{parties.length} recorded</span>
          </CardHeader>
          {parties.length === 0 ? (
            <CardContent>
              <p className="text-sm text-muted">No parties have been recorded for this matter.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-shell">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th className="hidden md:table-cell">Organisation</th>
                    <th className="hidden lg:table-cell">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((party) => (
                    <tr key={party.id}>
                      <td className="font-medium text-ink">{party.name}</td>
                      <td className="capitalize text-muted">{party.role.replace(/_/g, " ")}</td>
                      <td className="hidden text-muted md:table-cell">{party.organisation ?? "—"}</td>
                      <td className="hidden text-muted lg:table-cell">{party.email ?? party.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === "tasks" && permissions.canViewTasks ? (
        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Matter tasks</CardTitle>
              <span className="text-[11px] text-faint">{tasks.length} tasks</span>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {tasks.length === 0 ? (
                <p className="py-4 text-sm text-muted">No tasks have been created for this matter.</p>
              ) : (
                tasks.map((task) => {
                  const due = dueLabel(task.dueOn, todayIsoDate());
                  return (
                    <div key={task.id} className="rounded-lg border border-line px-3.5 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[13px] font-medium text-ink">{task.title}</p>
                        <div className="flex items-center gap-1.5">
                          <TaskPriorityBadge priority={task.priority} />
                          <TaskStatusBadge status={task.status} />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-faint">
                          {task.assigneeName ?? "Unassigned"}
                          <span aria-hidden> · </span>
                          <span className={due.tone === "overdue" ? "font-medium text-danger" : ""}>
                            {due.label}
                          </span>
                        </p>
                        <TaskCompleteForm
                          taskId={task.id}
                          status={task.status}
                          redirectTo={`/matters/${matter.id}?tab=tasks`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {permissions.canCreateTasks ? (
            <Card>
              <CardHeader>
                <CardTitle>Add a task</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskForm members={eligibleMembers} matterId={matter.id} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "documents" && canSeeDocuments ? (
        <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div>
            <DocumentList
              documents={documents}
              canManage={canManageDocuments}
              returnTo={`/matters/${matter.id}?tab=documents`}
              showMatter={false}
            />
          </div>
          {canUploadDocuments ? (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Add a document</CardTitle>
                <FolderClosed className="size-4 text-teal-600" aria-hidden />
              </CardHeader>
              <CardContent>
                <DocumentUploadForm
                  matterId={matter.id}
                  returnTo={`/matters/${matter.id}?tab=documents`}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "calendar" && canSeeCalendar && calendarData ? (
        <CalendarSection
          events={calendarData.events}
          deadlines={calendarData.deadlines}
          matters={[]}
          members={eligibleMembers}
          returnTo={`/matters/${matter.id}?tab=calendar`}
          fixedMatterId={matter.id}
          canCreate={canCreateCalendar}
          canUpdate={canUpdateCalendar}
        />
      ) : null}

      {tab === "activity" ? (
        <Card>
          <CardHeader>
            <CardTitle>Activity timeline</CardTitle>
            <span className="text-[11px] text-faint">Append-only audit history</span>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted">No activity has been recorded for this matter yet.</p>
            ) : (
              <ol className="space-y-4">
                {activity.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                    <div>
                      <p className="text-[12.5px] font-medium text-ink">{humaniseAction(event.action)}</p>
                      <p className="text-[11px] text-faint">
                        {event.actorName ?? "System"} · {formatDateTime(event.createdAt)} ·{" "}
                        {formatRelative(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "billing" && canSeeFinancials ? (
        <EmptyState
          icon={<FileText className="size-5" aria-hidden />}
          title="Matter financials arrive in Stage 6"
          description="Time recording, disbursements and invoices will attach to this matter. Legal trust accounting remains a separate, restricted module requiring independent validation."
          stage="Stage 6"
        />
      ) : null}

      {tab === "ai" && canUseAi ? (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Matter AI threads</CardTitle>
              <Sparkles className="size-4 text-teal-600" aria-hidden />
            </CardHeader>
            <CardContent className="space-y-3">
              {aiThreads.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="size-5" aria-hidden />}
                  title="No questions asked yet"
                  description="Ask a question from the AI workspace. Retrieval is restricted to this matter and to documents your account may read."
                />
              ) : (
                aiThreads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/ai?thread=${thread.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 hover:border-teal-500/40 hover:bg-canvas/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{thread.title}</p>
                      <p className="mt-0.5 text-[11px] text-faint">
                        Updated {formatRelative(thread.updatedAt)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-teal-600">Open</span>
                  </Link>
                ))
              )}
              <LinkButton href={`/ai?matter=${matter.id}`} size="sm">
                Ask this matter
              </LinkButton>
            </CardContent>
          </Card>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Approval queue</h2>
              <span className="text-[11px] text-faint">AI cannot write directly</span>
            </div>
            <AiProposalList
              proposals={aiProposals}
              currentUserId={session.actor.userId}
              canApprove={canApproveAi}
              returnTo={`/matters/${matter.id}?tab=ai`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
