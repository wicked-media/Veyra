import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@veyra/ui";
import { listClients, listMembers } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { LinkButton } from "@/components/link-button";
import { MatterForm } from "@/components/forms/matter-form";

export const metadata: Metadata = { title: "New matter" };

export default async function NewMatterPage() {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("matter:create")) redirect("/matters");

  const db = await getDb();
  const [clients, members] = await Promise.all([
    listClients(db, session.actor, { status: "active", limit: 100 }),
    listMembers(db, session.actor)
  ]);

  const eligibleMembers = members
    .filter((member) => member.status === "active")
    .map((member) => ({ userId: member.userId, name: member.name, role: member.role }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Matters"
        title="Open a matter"
        description="A matter number is allocated automatically from your firm's numbering rules. Restricted matters are visible only to their team."
        actions={<LinkButton href="/matters">Back to matters</LinkButton>}
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-5" aria-hidden />}
          title="Create a client first"
          description="Every matter belongs to a client record so conflicts, engagement and billing stay attached to the right party."
          action={
            <LinkButton href="/clients/new" size="sm">
              Create a client
            </LinkButton>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <MatterForm
              clients={clients.map((client) => ({
                id: client.id,
                displayName: client.displayName,
                type: client.type
              }))}
              members={eligibleMembers}
              defaultResponsibleUserId={session.actor.userId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
