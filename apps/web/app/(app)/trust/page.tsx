import type { Metadata } from "next";
import { Landmark, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@veyra/ui";
import { requireAppSession } from "@/lib/session";
import { AccessDenied } from "@/components/access-denied";
import { PlannedModule } from "@/components/planned-module";

export const metadata: Metadata = { title: "Trust accounting" };

export default async function TrustPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("trust:read")) {
    return <AccessDenied description="Trust balances are restricted to authorised financial roles." />;
  }

  return (
    <PlannedModule
      eyebrow="Firm operations"
      title="Trust accounting"
      description="Australian legal trust accounting, deliberately locked until independently validated."
      stage="Stage 9"
      icon={<Landmark className="size-5" aria-hidden />}
      points={[
        "Double-entry trust ledgers with immutable posted transactions and idempotent posting.",
        "Client and matter trust balances, controlled receipts and payments, reconciliation and statements.",
        "Separation of duties, approval controls, reversal workflows and external examination support.",
        "Jurisdiction-specific reporting with independent accounting and legal review."
      ]}
      note="No trust transaction can be created in this build. The module is not merely unfinished — it is gated."
    >
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <ShieldAlert className="size-4" aria-hidden />
            Release gate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-[11.5px] leading-relaxed text-muted">
          <p>
            Operating a legal trust account is a regulated activity. Passing software tests does not
            establish compliance with NSW or any other jurisdiction&apos;s trust accounting rules.
          </p>
          <p>
            This module must not be released until it has been reviewed by a qualified legal
            accountant and independently validated against the applicable requirements, with
            documented controls and reconciliation testing.
          </p>
        </CardContent>
      </Card>
    </PlannedModule>
  );
}
