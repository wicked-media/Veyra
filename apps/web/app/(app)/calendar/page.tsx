import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AccessDenied } from "@/components/access-denied";
import { CalendarSection } from "@/components/calendar/calendar-section";
import { LinkButton } from "@/components/link-button";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { listCalendar, listMatters, listMembers } from "@veyra/core";
import { PageHeader } from "@veyra/ui";

export const metadata: Metadata = { title: "Calendar" };

function monthWindow(month: string | undefined): {
  month: string;
  from: string;
  to: string;
  label: string;
  previous: string;
  next: string;
} {
  const now = new Date();
  const selected = /^\d{4}-\d{2}$/.test(month ?? "") ? (month as string) : null;
  const [year, monthNumber] = selected
    ? selected.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const safeYear = year ?? now.getUTCFullYear();
  const safeMonth = monthNumber ?? now.getUTCMonth() + 1;
  const from = `${safeYear}-${String(safeMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();
  const to = `${safeYear}-${String(safeMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const previousDate = new Date(Date.UTC(safeYear, safeMonth - 2, 1));
  const nextDate = new Date(Date.UTC(safeYear, safeMonth, 1));
  const monthKey = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(safeYear, safeMonth - 1, 1)));

  return {
    month: `${safeYear}-${String(safeMonth).padStart(2, "0")}`,
    from,
    to,
    label,
    previous: monthKey(previousDate),
    next: monthKey(nextDate)
  };
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("calendar:read")) {
    return <AccessDenied description="Calendar access is not included in your role." />;
  }

  const query = await searchParams;
  const window = monthWindow(query.month);
  const db = await getDb();
  const [calendar, matters, members] = await Promise.all([
    listCalendar(db, session.actor, { from: window.from, to: window.to, limit: 200 }),
    listMatters(db, session.actor, { status: "all", limit: 100 }),
    session.actor.permissions.includes("user:read")
      ? listMembers(db, session.actor)
      : Promise.resolve([])
  ]);

  const canCreate = session.actor.permissions.includes("calendar:create");
  const canUpdate = session.actor.permissions.includes("calendar:update");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Practice intelligence"
        title="Calendar & deadlines"
        description="Court dates, client meetings and deadline records. Consequential dates remain unverified until a qualified person confirms them."
        actions={
          <>
            <LinkButton href={`/calendar?month=${window.previous}`} variant="secondary" size="sm">
              <ChevronLeft className="size-3.5" aria-hidden />
              Previous
            </LinkButton>
            <span className="min-w-[140px] text-center text-sm font-medium text-ink">
              {window.label}
            </span>
            <LinkButton href={`/calendar?month=${window.next}`} variant="secondary" size="sm">
              Next
              <ChevronRight className="size-3.5" aria-hidden />
            </LinkButton>
            <LinkButton href="/calendar" variant="ghost" size="sm">
              This month
            </LinkButton>
          </>
        }
      />

      {query.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs leading-relaxed text-danger"
        >
          {query.error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-[11px] leading-relaxed text-warning">
        <span className="font-semibold uppercase tracking-[0.1em]">Deadline control</span>
        <span className="text-muted">
          Veyra records dates; it does not calculate limitation periods or procedural deadlines.
          Verify each consequential date against the applicable rules and record who checked it.
        </span>
      </div>

      <CalendarSection
        events={calendar.events}
        deadlines={calendar.deadlines}
        matters={matters.map((matter) => ({
          id: matter.id,
          matterNumber: matter.matterNumber,
          title: matter.title
        }))}
        members={members
          .filter((member) => member.status === "active")
          .map((member) => ({ userId: member.userId, name: member.name }))}
        returnTo={`/calendar?month=${window.month}`}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />

      <p className="text-[11px] text-faint">
        Calendar records are matter-scoped and respect ethical walls.{" "}
        <Link href="/matters" className="text-teal-600 hover:text-teal-500">
          Open a matter
        </Link>{" "}
        to see its full date record.
      </p>
    </div>
  );
}
