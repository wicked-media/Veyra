import type { Metadata } from "next";
import { Database, Lock, ShieldCheck } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, PageHeader } from "@veyra/ui";
import { getOrganisation } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { AccessDenied } from "@/components/access-denied";
import { OrgSettingsForm } from "@/components/forms/org-settings-form";

export const metadata: Metadata = { title: "Firm settings" };

export default async function SettingsPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("org:manage")) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Firm settings" />
        <AccessDenied description="Firm settings can only be changed by owners and administrators with firm-management permission." />
      </div>
    );
  }

  const organisation = await getOrganisation(await getDb(), session.actor);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Firm settings"
        description="Numbering, time zone and financial year. Changes write an audit event."
      />

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Firm profile</CardTitle>
            <Badge tone="neutral">{organisation.slug}</Badge>
          </CardHeader>
          <CardContent>
            <OrgSettingsForm
              organisation={{
                name: organisation.name,
                matterNumberPrefix: organisation.matterNumberPrefix,
                timezone: organisation.timezone,
                financialYearStartMonth: organisation.financialYearStartMonth
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Security controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[11.5px] leading-relaxed text-muted">
              {[
                [ShieldCheck, "Sessions", "Opaque 256-bit tokens hashed at rest, HttpOnly, SameSite=Lax, 12-hour expiry."],
                [Lock, "Authorisation", "Server-side checks on every operation; matter restrictions and ethical walls are applied after role permissions."],
                [Database, "Audit", "Append-only table with a database trigger rejecting updates, deletes and truncation."]
              ].map(([Icon, title, detail]) => {
                const IconComponent = Icon as typeof ShieldCheck;
                return (
                  <div key={String(title)} className="flex items-start gap-2.5">
                    <IconComponent className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                    <div>
                      <p className="text-[12px] font-medium text-ink">{String(title)}</p>
                      <p>{String(detail)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regulatory posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px] leading-relaxed text-muted">
              <p>
                Veyra is designed around Australian privacy, confidentiality and legal practice
                obligations, but it is not certified or independently audited.
              </p>
              <p>
                Do not enable trust accounting or production client data until independent legal,
                security and accounting review is complete.
              </p>
              <p className="rounded-md border border-dashed border-line px-2.5 py-2 text-[10.5px] text-faint">
                See <span className="font-mono">docs/compliance/regulatory-map.md</span> and the trust
                module gate.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
