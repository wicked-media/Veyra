import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  KeyRound,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
import { PERMISSIONS, ROLE_LABELS } from "@veyra/contracts";
import { Badge, Card, CardContent, CardHeader, CardTitle, PageHeader } from "@veyra/ui";
import { getOrganisation } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const session = await requireAppSession();
  const organisation = await getOrganisation(await getDb(), session.actor);

  const canManageUsers = session.actor.permissions.includes("user:manage");
  const canReadAudit = session.actor.permissions.includes("audit:read");
  const canManageFirm = session.actor.permissions.includes("org:manage");
  const canReadIntegrations = session.actor.permissions.includes("integration:read");

  const links = [
    {
      href: "/admin/members",
      title: "Members",
      detail: "Invite people, assign roles and review access.",
      icon: Users,
      visible: canManageUsers
    },
    {
      href: "/admin/roles",
      title: "Roles & permissions",
      detail: "The exact permission matrix enforced by the server.",
      icon: KeyRound,
      visible: canManageUsers || canManageFirm
    },
    {
      href: "/admin/audit",
      title: "Audit log",
      detail: "Append-only firm activity, filtered by what you can see.",
      icon: ScrollText,
      visible: canReadAudit
    },
    {
      href: "/admin/settings",
      title: "Firm settings",
      detail: "Matter numbering, time zone and financial year.",
      icon: Settings,
      visible: canManageFirm
    },
    {
      href: "/admin/integrations",
      title: "Integrations",
      detail: "What is connected — and honestly, what is not yet built.",
      icon: ShieldCheck,
      visible: canReadIntegrations
    }
  ].filter((entry) => entry.visible);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Firm operations"
        title="Administration"
        description={`${organisation.name} · firm reference ${organisation.slug}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-teal-500/40"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-canvas text-teal-600">
                  <Icon className="size-4" aria-hidden />
                </span>
                <ArrowUpRight className="size-4 text-faint transition-colors group-hover:text-teal-600" aria-hidden />
              </div>
              <p className="mt-4 text-[13px] font-semibold text-ink">{entry.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{entry.detail}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Firm record</CardTitle>
            <Badge tone="teal" dot>
              Active
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
            {[
              ["Firm name", organisation.name],
              ["Timezone", organisation.timezone],
              ["Matter prefix", organisation.matterNumberPrefix],
              ["Financial year starts", `${organisation.financialYearStartMonth}/12`],
              ["Your role", ROLE_LABELS[session.actor.role]],
              ["Permission grants", `${session.actor.permissions.length} of ${PERMISSIONS.length}`]
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
                <p className="mt-1 text-[12.5px] text-ink">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access controls in force</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Server-side authorisation", "Every read and write is re-checked against the session, never the UI."],
              ["Ethical walls", "A wall denies reads and writes, including for firm owners."],
              ["Immutable audit", "A database trigger rejects edits and deletes of audit history."],
              ["Session security", "Opaque tokens, HttpOnly cookies, 12-hour expiry, revocation on password change."]
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

      {!canManageFirm ? (
        <Card>
          <CardContent className="flex items-start gap-2.5 pt-4 text-xs leading-relaxed text-muted">
            <UserRound className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
            Your role has limited administration access. Firm settings and member management are
            restricted to owners and administrators.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
