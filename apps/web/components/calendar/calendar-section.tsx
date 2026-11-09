import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, MapPin } from "lucide-react";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  DEADLINE_CATEGORY_LABELS,
  DEADLINE_STATUS_LABELS
} from "@veyra/contracts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Textarea } from "@veyra/ui";
import type { CalendarEventRow, DeadlineRow } from "@veyra/core";
import {
  createCalendarEventAction,
  createDeadlineAction,
  updateDeadlineStatusAction,
  verifyDeadlineAction
} from "@/lib/actions/calendar";
import { dueLabel, formatDate, formatDateTime, todayIsoDate } from "@/lib/format";

function verificationTone(verification: DeadlineRow["verification"]): "teal" | "amber" {
  return verification === "verified" ? "teal" : "amber";
}

function deadlineTone(status: DeadlineRow["status"]): "neutral" | "teal" | "amber" | "red" {
  if (status === "met") return "teal";
  if (status === "missed") return "red";
  if (status === "waived") return "neutral";
  return "amber";
}

export function CalendarSection({
  events,
  deadlines,
  matters,
  members,
  returnTo,
  fixedMatterId,
  canCreate,
  canUpdate
}: {
  events: CalendarEventRow[];
  deadlines: DeadlineRow[];
  matters: { id: string; matterNumber: string; title: string }[];
  members: { userId: string; name: string }[];
  returnTo: string;
  fixedMatterId?: string;
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const today = todayIsoDate();

  return (
    <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
            <span className="text-[11px] text-faint">{events.length} scheduled</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="py-4 text-sm text-muted">No events in this period.</p>
            ) : (
              events.map((event) => (
                <article key={event.id} className="rounded-xl border border-line px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">{event.title}</p>
                      <p className="mt-0.5 text-[11px] text-faint">
                        {event.matterId ? (
                          <Link
                            href={`/matters/${event.matterId}?tab=calendar`}
                            className="text-teal-600 hover:text-teal-500"
                          >
                            {event.matterNumber}
                          </Link>
                        ) : (
                          "Firm-wide"
                        )}
                        {event.assignedName ? ` · ${event.assignedName}` : ""}
                      </p>
                    </div>
                    <Badge tone="blue">{CALENDAR_EVENT_TYPE_LABELS[event.eventType]}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5 text-teal-600" aria-hidden />
                      {event.allDay
                        ? `${formatDate(event.startsAt)} · All day`
                        : formatDateTime(event.startsAt)}
                      {event.endsAt && !event.allDay ? ` – ${formatDateTime(event.endsAt)}` : ""}
                    </span>
                    {event.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-teal-600" aria-hidden />
                        {event.location}
                      </span>
                    ) : null}
                  </div>
                  {event.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted">{event.description}</p>
                  ) : null}
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deadlines and key dates</CardTitle>
            <span className="text-[11px] text-faint">{deadlines.length} tracked</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.length === 0 ? (
              <p className="py-4 text-sm text-muted">No deadlines recorded in this period.</p>
            ) : (
              deadlines.map((deadline) => {
                const due = dueLabel(deadline.dueOn, today);
                return (
                  <article key={deadline.id} className="rounded-xl border border-line px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink">{deadline.title}</p>
                        <p className="mt-0.5 text-[11px] text-faint">
                          <Link
                            href={`/matters/${deadline.matterId}?tab=calendar`}
                            className="text-teal-600 hover:text-teal-500"
                          >
                            {deadline.matterNumber}
                          </Link>{" "}
                          · {DEADLINE_CATEGORY_LABELS[deadline.category]}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={verificationTone(deadline.verification)} dot>
                          {deadline.verification === "verified" ? "Human verified" : "Unverified"}
                        </Badge>
                        <Badge tone={deadlineTone(deadline.status)}>
                          {DEADLINE_STATUS_LABELS[deadline.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={
                          due.tone === "overdue"
                            ? "text-[11px] font-medium text-danger"
                            : "text-[11px] text-muted"
                        }
                      >
                        {due.label}
                        {deadline.verifiedByName
                          ? ` · verified by ${deadline.verifiedByName}${deadline.verifiedAt ? ` on ${formatDate(deadline.verifiedAt)}` : ""}`
                          : ""}
                      </p>
                      {canUpdate ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {deadline.verification === "unverified" ? (
                            <form action={verifyDeadlineAction}>
                              <input type="hidden" name="deadlineId" value={deadline.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <Button type="submit" variant="subtle" size="sm">
                                <CheckCircle2 className="size-3.5" aria-hidden />
                                I verified this date
                              </Button>
                            </form>
                          ) : null}
                          <form action={updateDeadlineStatusAction} className="flex items-center gap-1.5">
                            <input type="hidden" name="deadlineId" value={deadline.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <label htmlFor={`deadline-status-${deadline.id}`} className="sr-only">
                              Deadline status
                            </label>
                            <Select
                              id={`deadline-status-${deadline.id}`}
                              name="status"
                              defaultValue={deadline.status}
                              className="h-8 w-[105px] text-xs"
                            >
                              {(["open", "met", "missed", "waived"] as const).map((status) => (
                                <option key={status} value={status}>
                                  {DEADLINE_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </Select>
                            <Button type="submit" variant="secondary" size="sm">
                              Update
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                    {deadline.notes ? (
                      <p className="mt-2 text-xs leading-relaxed text-muted">{deadline.notes}</p>
                    ) : null}
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>Add an event</CardTitle>
              <CalendarDays className="size-4 text-teal-600" aria-hidden />
            </CardHeader>
            <CardContent>
              <form action={createCalendarEventAction} className="space-y-4">
                <input type="hidden" name="returnTo" value={returnTo} />
                {fixedMatterId ? (
                  <input type="hidden" name="matterId" value={fixedMatterId} />
                ) : (
                  <Field label="Matter" htmlFor="event-matter" hint="Leave blank for a firm-wide event">
                    <Select id="event-matter" name="matterId" defaultValue="">
                      <option value="">Firm-wide</option>
                      {matters.map((matter) => (
                        <option key={matter.id} value={matter.id}>
                          {matter.matterNumber} · {matter.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Title" htmlFor="event-title">
                  <Input id="event-title" name="title" required maxLength={240} placeholder="e.g. Directions hearing" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type" htmlFor="event-type">
                    <Select id="event-type" name="eventType" defaultValue="hearing">
                      {(["hearing", "court_date", "meeting", "internal", "other"] as const).map((type) => (
                        <option key={type} value={type}>
                          {CALENDAR_EVENT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Start" htmlFor="event-start">
                    <Input id="event-start" name="startsAt" type="datetime-local" required />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="End" htmlFor="event-end" hint="Optional">
                    <Input id="event-end" name="endsAt" type="datetime-local" />
                  </Field>
                  <Field label="Location" htmlFor="event-location" hint="Optional">
                    <Input id="event-location" name="location" maxLength={200} placeholder="Court or video link" />
                  </Field>
                </div>
                {members.length > 0 ? (
                  <Field label="Assign to" htmlFor="event-assignee" hint="Optional">
                    <Select id="event-assignee" name="assignedUserId" defaultValue="">
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" name="allDay" className="size-4 rounded border-line accent-teal-500" />
                  All-day event
                </label>
                <Field label="Notes" htmlFor="event-description" hint="Optional">
                  <Textarea id="event-description" name="description" maxLength={2000} />
                </Field>
                <Button type="submit" size="sm" className="w-full">
                  Add event
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>Add a deadline</CardTitle>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-warning">
                Human verified
              </span>
            </CardHeader>
            <CardContent>
              <form action={createDeadlineAction} className="space-y-4">
                <input type="hidden" name="returnTo" value={returnTo} />
                {fixedMatterId ? (
                  <input type="hidden" name="matterId" value={fixedMatterId} />
                ) : (
                  <Field label="Matter" htmlFor="deadline-matter">
                    <Select id="deadline-matter" name="matterId" required defaultValue="">
                      <option value="" disabled>
                        Select a matter
                      </option>
                      {matters.map((matter) => (
                        <option key={matter.id} value={matter.id}>
                          {matter.matterNumber} · {matter.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Deadline" htmlFor="deadline-title">
                  <Input id="deadline-title" name="title" required maxLength={240} placeholder="e.g. File defence" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Category" htmlFor="deadline-category">
                    <Select id="deadline-category" name="category" defaultValue="court">
                      {(["limitation", "filing", "court", "statutory", "internal"] as const).map((category) => (
                        <option key={category} value={category}>
                          {DEADLINE_CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Due date" htmlFor="deadline-due">
                    <Input id="deadline-due" name="dueOn" type="date" required />
                  </Field>
                </div>
                <Field label="Notes" htmlFor="deadline-notes" hint="Record the source or rule relied on">
                  <Textarea id="deadline-notes" name="notes" maxLength={2000} />
                </Field>
                <Button type="submit" size="sm" className="w-full">
                  Add unverified deadline
                </Button>
                <p className="text-[10.5px] leading-relaxed text-faint">
                  Veyra does not calculate limitation dates or procedural deadlines automatically.
                  A qualified person must verify the date against the applicable rules before relying on it.
                </p>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
