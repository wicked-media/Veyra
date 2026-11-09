import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select
} from "@veyra/ui";
import { listClients } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { LinkButton } from "@/components/link-button";
import { RiskBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAppSession();
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const q = first(raw.q)?.trim() || undefined;
  const status = (first(raw.status) as "active" | "archived" | "all" | undefined) ?? "active";

  const clients = await listClients(await getDb(), session.actor, { q, status, limit: 100 });
  const canCreate = session.actor.permissions.includes("client:create");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Clients"
        description="The firm's client record: identity, risk, relationships and every related matter."
        actions={
          canCreate ? (
            <LinkButton href="/clients/new" variant="primary">
              <Plus className="size-4" aria-hidden />
              New client
            </LinkButton>
          ) : null
        }
      />

      <Card className="p-4">
        <form method="get" action="/clients" className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label htmlFor="client-search" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Search clients
            </label>
            <Input
              id="client-search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name, organisation or email"
            />
          </div>
          <div className="w-40">
            <label htmlFor="client-status" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Status
            </label>
            <Select id="client-status" name="status" defaultValue={status}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <Link href="/clients" className="pb-2.5 text-xs text-muted hover:text-ink">
            Clear
          </Link>
        </form>
      </Card>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" aria-hidden />}
          title="No clients match"
          description="Client records hold identity, risk rating, contacts and the matters that belong to them."
          action={
            canCreate ? (
              <LinkButton href="/clients/new" size="sm">
                Create a client
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
                  <th>Client</th>
                  <th className="hidden sm:table-cell">Type</th>
                  <th>Open matters</th>
                  <th>Risk</th>
                  <th className="hidden md:table-cell">Contact</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link href={`/clients/${client.id}`} className="group block">
                        <span className="block text-[13px] font-medium text-ink group-hover:text-teal-600">
                          {client.displayName}
                        </span>
                        {client.status === "archived" ? (
                          <span className="text-[10px] uppercase tracking-wider text-faint">Archived</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell">
                      <Badge tone={client.type === "organisation" ? "blue" : "neutral"}>
                        {client.type === "organisation" ? "Organisation" : "Individual"}
                      </Badge>
                    </td>
                    <td className="tabular-nums text-muted">{client.openMatters}</td>
                    <td>
                      <RiskBadge rating={client.riskRating} />
                    </td>
                    <td className="hidden max-w-56 truncate text-muted md:table-cell">
                      {client.email ?? client.phone ?? "—"}
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
