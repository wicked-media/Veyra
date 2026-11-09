import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, Select } from "@veyra/ui";
import { listAuditEvents } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { formatDateTime, humaniseAction } from "@/lib/format";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Audit log" };

const ENTITY_TYPES = ["matter", "client", "task", "membership", "organisation", "session", "user"];

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ entityType?: string }>;
}) {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("audit:read")) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Audit log" />
        <AccessDenied description="The firm audit trail is available to owners, administrators and principals with explicit audit access." />
      </div>
    );
  }

  const query = await searchParams;
  const entityType =
    query.entityType && ENTITY_TYPES.includes(query.entityType) ? query.entityType : undefined;
  const events = await listAuditEvents(await getDb(), session.actor, { entityType, limit: 150 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Append-only evidence of firm activity. Entries cannot be edited or deleted, and events on walled or restricted matters stay hidden."
      />

      <Card className="p-4">
        <form method="get" action="/admin/audit" className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label htmlFor="audit-entity" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Entity type
            </label>
            <Select id="audit-entity" name="entityType" defaultValue={entityType ?? ""}>
              <option value="">All activity</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/^\w/, (character) => character.toUpperCase())}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <Link href="/admin/audit" className="pb-2.5 text-xs text-muted hover:text-ink">
            Clear
          </Link>
          <span className="ml-auto pb-2.5 text-[10.5px] text-faint">{events.length} events shown</span>
        </form>
      </Card>

      {events.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="size-5" aria-hidden />}
          title="No audit events"
          description="Activity appears here as firm members create and change records. Matters you cannot access do not contribute visible events."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Event</th>
                  <th className="hidden md:table-cell">Entity</th>
                  <th className="hidden lg:table-cell">Context</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap text-[11px] text-muted">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-[11.5px] text-ink">{event.actorName ?? "System"}</td>
                    <td>
                      <p className="text-[12px] font-medium text-ink">{humaniseAction(event.action)}</p>
                      <p className="font-mono text-[9.5px] text-faint">{event.action}</p>
                    </td>
                    <td className="hidden md:table-cell">
                      <Badge tone="neutral">{event.entityType}</Badge>
                    </td>
                    <td className="hidden max-w-64 lg:table-cell">
                      {event.matterId ? (
                        <Link
                          href={`/matters/${event.matterId}?tab=activity`}
                          className="text-[11px] text-teal-600 hover:text-teal-500"
                        >
                          View matter
                        </Link>
                      ) : null}
                      {Object.keys(event.metadata).length > 0 ? (
                        <details className="mt-1 text-[10.5px] text-muted">
                          <summary className="cursor-pointer text-faint hover:text-ink">Details</summary>
                          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-canvas px-2 py-1.5 font-mono text-[9.5px]">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-[10.5px] text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
