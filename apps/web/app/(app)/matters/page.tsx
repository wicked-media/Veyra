import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import {
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  listMattersQuerySchema,
  type PracticeArea
} from "@veyra/contracts";
import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select
} from "@veyra/ui";
import { listMatters } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { LinkButton } from "@/components/link-button";
import { MatterStatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Matters" };

export default async function MattersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAppSession();
  const raw = await searchParams;

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const parsed = listMattersQuerySchema.safeParse({
    q: first(raw.q) || undefined,
    status: first(raw.status) || "all",
    practiceArea: first(raw.practiceArea) || undefined,
    limit: "100"
  });
  const filters = parsed.success ? parsed.data : { status: "all" as const, limit: 100 };

  const matters = await listMatters(await getDb(), session.actor, filters);
  const canCreate = session.actor.permissions.includes("matter:create");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Matters"
        description="Every matter is one shared workspace for the client, the team, the work and the record."
        actions={
          canCreate ? (
            <LinkButton href="/matters/new" variant="primary">
              <Plus className="size-4" aria-hidden />
              New matter
            </LinkButton>
          ) : null
        }
      />

      <Card className="p-4">
        <form method="get" action="/matters" className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label htmlFor="matter-search" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Search
            </label>
            <Input
              id="matter-search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Matter title, number or client"
            />
          </div>
          <div className="w-40">
            <label htmlFor="matter-status" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Status
            </label>
            <Select id="matter-status" name="status" defaultValue={filters.status ?? "all"}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="on_hold">On hold</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          <div className="w-48">
            <label htmlFor="matter-area" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Practice area
            </label>
            <Select id="matter-area" name="practiceArea" defaultValue={filters.practiceArea ?? ""}>
              <option value="">All areas</option>
              {PRACTICE_AREAS.map((area: PracticeArea) => (
                <option key={area} value={area}>
                  {PRACTICE_AREA_LABELS[area]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <Link href="/matters" className="pb-2.5 text-xs text-muted hover:text-ink">
            Clear
          </Link>
        </form>
      </Card>

      {matters.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-5" aria-hidden />}
          title="No matters match"
          description="Try a broader search or clear the filters. Matters you cannot see — including restricted matters and matters subject to an ethical wall — never appear here."
          action={
            canCreate ? (
              <LinkButton href="/matters/new" size="sm">
                Open a matter
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Matter</th>
                  <th className="hidden md:table-cell">Client</th>
                  <th className="hidden lg:table-cell">Practice area</th>
                  <th className="hidden lg:table-cell">Responsible</th>
                  <th>Status</th>
                  <th className="hidden sm:table-cell">Opened</th>
                </tr>
              </thead>
              <tbody>
                {matters.map((matter) => (
                  <tr key={matter.id}>
                    <td>
                      <Link href={`/matters/${matter.id}`} className="group block min-w-0">
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">
                          {matter.matterNumber}
                          {matter.restricted ? (
                            <span className="ml-2 rounded border border-warning/30 bg-warning/10 px-1 py-0.5 text-[8px] font-semibold text-warning">
                              Restricted
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block max-w-80 truncate text-[13px] font-medium text-ink group-hover:text-teal-600">
                          {matter.title}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden max-w-48 truncate text-muted md:table-cell">{matter.clientName}</td>
                    <td className="hidden text-muted lg:table-cell">
                      {PRACTICE_AREA_LABELS[matter.practiceArea]}
                    </td>
                    <td className="hidden text-muted lg:table-cell">{matter.responsibleName}</td>
                    <td>
                      <MatterStatusBadge status={matter.status} />
                    </td>
                    <td className="hidden whitespace-nowrap text-muted sm:table-cell">
                      {formatDate(matter.openedAt)}
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
