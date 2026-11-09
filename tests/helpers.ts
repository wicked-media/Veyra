import { hashPassword } from "@veyra/auth";
import type { Permission, PracticeArea, Role } from "@veyra/contracts";
import { buildActor, type Actor } from "@veyra/core";
import {
  clients,
  createDatabase,
  matters,
  matterMembers,
  matterWalls,
  memberships,
  organisations,
  users,
  type DatabaseHandle,
  type VeyraDb
} from "@veyra/database";

export const TEST_PASSWORD = "Veyra!TestPassword2026";

let passwordHashPromise: Promise<string> | null = null;

export function testPasswordHash(): Promise<string> {
  passwordHashPromise ??= hashPassword(TEST_PASSWORD);
  return passwordHashPromise;
}

export interface TestFirm {
  id: string;
  name: string;
  slug: string;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  membershipId: string;
  actor: Actor;
}

export async function createTestDatabase(): Promise<DatabaseHandle> {
  const handle = await createDatabase({ pgliteDir: null });
  await handle.migrate();
  return handle;
}

export async function createFirm(
  db: VeyraDb,
  options: { name: string; slug: string; prefix?: string }
): Promise<TestFirm> {
  const rows = await db
    .insert(organisations)
    .values({
      name: options.name,
      slug: options.slug,
      matterNumberPrefix: options.prefix ?? "TST"
    })
    .returning({ id: organisations.id, name: organisations.name, slug: organisations.slug });

  const firm = rows[0];
  if (!firm) throw new Error("Test firm insert returned no row");
  return firm;
}

export async function createMember(
  db: VeyraDb,
  firm: TestFirm,
  options: { email: string; name: string; role: Role }
): Promise<TestUser> {
  const passwordHash = await testPasswordHash();

  const userRows = await db
    .insert(users)
    .values({
      email: options.email,
      name: options.name,
      passwordHash
    })
    .returning({ id: users.id, email: users.email, name: users.name });
  const user = userRows[0];
  if (!user) throw new Error("Test user insert returned no row");

  const membershipRows = await db
    .insert(memberships)
    .values({
      organisationId: firm.id,
      userId: user.id,
      role: options.role,
      status: "active"
    })
    .returning({ id: memberships.id });
  const membership = membershipRows[0];
  if (!membership) throw new Error("Test membership insert returned no row");

  const actor = buildActor({
    userId: user.id,
    organisationId: firm.id,
    organisationName: firm.name,
    membershipId: membership.id,
    role: options.role,
    name: user.name,
    email: user.email
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: options.role,
    membershipId: membership.id,
    actor
  };
}

export async function createClientFixture(
  db: VeyraDb,
  firm: TestFirm,
  options: { displayName: string; type?: "individual" | "organisation"; email?: string }
): Promise<{ id: string; displayName: string }> {
  const rows = await db
    .insert(clients)
    .values({
      organisationId: firm.id,
      type: options.type ?? "individual",
      displayName: options.displayName,
      firstName: options.type === "individual" ? options.displayName.split(" ")[0] ?? null : null,
      lastName: options.type === "individual" ? options.displayName.split(" ")[1] ?? null : null,
      organisationName: options.type === "organisation" ? options.displayName : null,
      email: options.email ?? null
    })
    .returning({ id: clients.id, displayName: clients.displayName });

  const client = rows[0];
  if (!client) throw new Error("Test client insert returned no row");
  return client;
}

export async function createMatterFixture(
  db: VeyraDb,
  firm: TestFirm,
  options: {
    clientId: string;
    responsibleUserId: string;
    matterNumber: string;
    title: string;
    restricted?: boolean;
    practiceArea?: PracticeArea;
    teamUserIds?: string[];
    status?: "open" | "on_hold" | "closed" | "archived";
  }
): Promise<{ id: string; matterNumber: string }> {
  const rows = await db
    .insert(matters)
    .values({
      organisationId: firm.id,
      clientId: options.clientId,
      matterNumber: options.matterNumber,
      title: options.title,
      practiceArea: options.practiceArea ?? "commercial",
      responsibleUserId: options.responsibleUserId,
      restricted: options.restricted ?? false,
      status: options.status ?? "open",
      createdBy: options.responsibleUserId
    })
    .returning({ id: matters.id, matterNumber: matters.matterNumber });

  const matter = rows[0];
  if (!matter) throw new Error("Test matter insert returned no row");

  const team = new Set([options.responsibleUserId, ...(options.teamUserIds ?? [])]);
  await db.insert(matterMembers).values(
    [...team].map((userId) => ({
      organisationId: firm.id,
      matterId: matter.id,
      userId,
      role: userId === options.responsibleUserId ? ("lead" as const) : ("member" as const)
    }))
  );

  return matter;
}

export async function addEthicalWall(
  db: VeyraDb,
  firm: TestFirm,
  matterId: string,
  userId: string,
  reason = "Test conflict screen"
): Promise<void> {
  await db.insert(matterWalls).values({
    organisationId: firm.id,
    matterId,
    userId,
    reason,
    createdBy: userId
  });
}

export function expectPermission(user: TestUser, permission: Permission): void {
  if (!user.actor.permissions.includes(permission)) {
    throw new Error(`Fixture ${user.email} lacks expected permission ${permission}`);
  }
}
