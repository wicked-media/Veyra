import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { requireAppSession } from "@/lib/session";
import { AccessDenied } from "@/components/access-denied";
import { PlannedModule } from "@/components/planned-module";

export const metadata: Metadata = { title: "Research" };

export default async function ResearchPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("integration:read")) {
    return <AccessDenied description="Legal research access is not included in your role." />;
  }

  return (
    <PlannedModule
      eyebrow="Practice intelligence"
      title="Legal research"
      description="Australian legislation and case law through licensed sources."
      stage="Stage 6"
      icon={<BookOpen className="size-5" aria-hidden />}
      points={[
        "Jurisdiction and court filters, saved authorities and research folders linked to matters.",
        "Citation verification with provenance — no invented authorities and no unlicensed scraping.",
        "Firm knowledge library, internal precedents and legislative change monitoring.",
        "Provider abstraction so multiple licensed research sources can be supported."
      ]}
      note="Research content licensing and court coverage must be confirmed with each provider before implementation."
    />
  );
}
