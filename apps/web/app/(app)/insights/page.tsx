import type { Metadata } from "next";
import { BarChart3, Briefcase, FolderCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, StatCard } from "@veyra/ui";
import { getInsights } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Insights" };

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-muted">{row.label}</span>
            <span className="font-medium tabular-nums text-ink">{row.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-teal-500"
              style={{ width: `${Math.max((row.count / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function InsightsPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("report:read")) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Firm operations" title="Insights" />
        <AccessDenied description="Reporting is not included in your role. Ask a principal or administrator if you need firm-level reporting access." />
      </div>
    );
  }

  const insights = await getInsights(await getDb(), session.actor);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Firm operations"
        title="Insights"
        description="Operational reporting based on the matters you can access. Financial and profitability reporting arrives with Stage 6."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Matters"
          value={insights.totals.matters}
          detail="Visible to you"
          icon={<Briefcase className="size-4" aria-hidden />}
        />
        <StatCard
          label="Open"
          value={insights.totals.openMatters}
          detail="Current workload"
          icon={<BarChart3 className="size-4" aria-hidden />}
        />
        <StatCard
          label="Closed"
          value={insights.totals.closedMatters}
          detail="Closed or archived"
          icon={<FolderCheck className="size-4" aria-hidden />}
        />
        <StatCard
          label="Active clients"
          value={insights.totals.activeClients}
          detail="Across the firm"
          icon={<Users className="size-4" aria-hidden />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By practice area</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.practiceAreas.length === 0 ? (
              <p className="text-sm text-muted">No matter data yet.</p>
            ) : (
              <Bars rows={insights.practiceAreas} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By status</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.statuses.length === 0 ? (
              <p className="text-sm text-muted">No matter data yet.</p>
            ) : (
              <Bars rows={insights.statuses} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By responsible practitioner</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.responsible.length === 0 ? (
              <p className="text-sm text-muted">No matter data yet.</p>
            ) : (
              <Bars rows={insights.responsible.map((row) => ({ label: row.name, count: row.count }))} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="text-[11.5px] leading-relaxed text-muted">
          Figures respect matter restrictions and ethical walls, so two users in the same firm can see
          different totals. Financial reporting, utilisation, realisation and trust balances are
          deliberately absent until the accounting and trust modules have been independently validated.
        </CardContent>
      </Card>
    </div>
  );
}
