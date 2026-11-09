import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, PageHeader } from "@veyra/ui";
import { requireAppSession } from "@/lib/session";
import { LinkButton } from "@/components/link-button";
import { ClientForm } from "@/components/forms/client-form";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("client:create")) redirect("/clients");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Create a client"
        description="Capture the minimum identity record now; contacts, addresses, KYC and conflict checks extend this record in later stages."
        actions={<LinkButton href="/clients">Back to clients</LinkButton>}
      />
      <Card>
        <CardContent className="pt-5">
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
