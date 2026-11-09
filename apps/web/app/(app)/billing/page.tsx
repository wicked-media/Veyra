import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { requireAppSession } from "@/lib/session";
import { AccessDenied } from "@/components/access-denied";
import { PlannedModule } from "@/components/planned-module";

export const metadata: Metadata = { title: "Time & billing" };

export default async function BillingPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("billing:read")) {
    return <AccessDenied description="Billing access is not included in your role." />;
  }

  return (
    <PlannedModule
      eyebrow="Firm operations"
      title="Time & billing"
      description="Time recording, disbursements and invoices with exact monetary arithmetic."
      stage="Stage 6"
      icon={<Receipt className="size-5" aria-hidden />}
      points={[
        "Billable and non-billable time, timers, rates, fixed fees and retainer arrangements.",
        "GST-aware invoices and credit notes using integer minor units — never floating point.",
        "Aged debtors, matter profitability, staff utilisation and approval workflows.",
        "Xero and MYOB export through verified official APIs."
      ]}
      note="Ordinary billing is separate from legal trust accounting, which is gated behind specialist review and independent validation."
    />
  );
}
