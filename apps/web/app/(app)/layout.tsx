import { getOrganisation } from "@veyra/core";
import { AppShell } from "@/components/shell/app-shell";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";

export default async function AuthenticatedLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAppSession();
  const organisation = await getOrganisation(await getDb(), session.actor);

  return (
    <AppShell
      actor={{
        name: session.actor.name,
        email: session.actor.email,
        role: session.actor.role,
        permissions: session.actor.permissions
      }}
      organisation={{
        id: organisation.id,
        name: organisation.name,
        slug: organisation.slug,
        timezone: organisation.timezone
      }}
      memberships={session.memberships}
    >
      {children}
    </AppShell>
  );
}
