import type { Metadata } from "next";
import { Plug, ShieldCheck } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, PageHeader } from "@veyra/ui";
import { integrationStatuses } from "@veyra/integrations";
import { requireAppSession } from "@/lib/session";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("integration:read")) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Integrations" />
        <AccessDenied description="Integration status is not included in your role." />
      </div>
    );
  }

  const items = integrationStatuses();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Integrations"
        description="What exists, what needs commercial approval, and what is deliberately not connected yet."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((integration) => (
          <Card key={integration.name}>
            <CardHeader>
              <CardTitle>{integration.name}</CardTitle>
              <Badge tone={integration.credentialStatus === "all_present" ? "amber" : "neutral"} dot>
                {integration.credentialStatus === "all_present"
                  ? "Credentials present · inactive"
                  : "Not connected"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                {integration.category} · {integration.stage}
              </p>
              <p className="text-[11.5px] leading-relaxed text-muted">{integration.detail}</p>
              {integration.envKeys.length > 0 ? (
                <p className="font-mono text-[10px] text-faint">Env: {integration.envKeys.join(", ")}</p>
              ) : (
                <p className="text-[10px] text-faint">Requires provider agreement and authorised access.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>No connector is active in this build</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[11.5px] leading-relaxed text-muted">
            <p className="flex items-start gap-2">
              <Plug className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
              The integration layer is specified, but no Microsoft Graph, Xero, MYOB, PEXA or
              e-signature calls are made in Stage 1.
            </p>
            <p>
              Presence of credentials does not imply a connection. Each integration will be verified
              against its official API, least-privilege scopes, retry and recovery behaviour.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credential handling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[11.5px] leading-relaxed text-muted">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
              Provider secrets belong in the deployment secret store, never in source control or the
              browser.
            </p>
            <p>
              OAuth tokens for each firm will be encrypted at rest, scoped per tenant, and revoked on
              disconnection. No shared demo credentials will be used.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
