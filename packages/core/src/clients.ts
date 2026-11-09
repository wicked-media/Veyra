import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { VeyraDb } from "@veyra/database";
import type { ClientSummary, MatterSummary } from "@veyra/contracts";
import {
  auditEvents,
  clientAddresses,
  clientContacts,
  clients,
  matters,
  users
} from "@veyra/database";
import { assertPermission } from "./access";
import { recordAudit } from "./audit";
import { notFound } from "./errors";
import { listMatters, type MatterActivityItem } from "./matters";
import type { Actor, DbExecutor } from "./types";

export interface ClientListFilters {
  q?: string;
  status?: "active" | "archived" | "all";
  limit?: number;
}

export interface ClientContact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface ClientAddress {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string;
}

export interface ClientWorkspace {
  client: {
    id: string;
    type: string;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
    organisationName: string | null;
    email: string | null;
    phone: string | null;
    abn: string | null;
    status: string;
    riskRating: string;
    source: string | null;
    notes: string | null;
    createdAt: string;
  };
  matters: MatterSummary[];
  contacts: ClientContact[];
  addresses: ClientAddress[];
  activity: MatterActivityItem[];
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listClients(
  db: DbExecutor,
  actor: Actor,
  filters: ClientListFilters = {}
): Promise<ClientSummary[]> {
  assertPermission(actor, "client:read");

  const conditions = [eq(clients.organisationId, actor.organisationId)];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(clients.status, filters.status));
  }
  if (filters.q) {
    const term = `%${escapeLike(filters.q)}%`;
    const search = or(
      ilike(clients.displayName, term),
      ilike(clients.email, term),
      ilike(clients.organisationName, term)
    );
    if (search) conditions.push(search);
  }

  const rows = await db
    .select({
      id: clients.id,
      displayName: clients.displayName,
      type: clients.type,
      status: clients.status,
      riskRating: clients.riskRating,
      email: clients.email,
      phone: clients.phone,
      openMatters: sql<number>`(
        select count(*)::int from ${matters}
        where ${matters.clientId} = ${clients.id} and ${matters.status} = 'open'
      )`
    })
    .from(clients)
    .where(and(...conditions))
    .orderBy(desc(clients.updatedAt))
    .limit(filters.limit ?? 50);

  return rows;
}

export async function getClientWorkspace(
  db: DbExecutor,
  actor: Actor,
  clientId: string
): Promise<ClientWorkspace> {
  assertPermission(actor, "client:read");

  const clientRows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organisationId, actor.organisationId)))
    .limit(1);
  const client = clientRows[0];
  if (!client) throw notFound("Client not found");

  const matterList = await listMatters(db, actor, { clientId, status: "all", limit: 100 });

  const contacts = await db
    .select({
      id: clientContacts.id,
      name: clientContacts.name,
      title: clientContacts.title,
      email: clientContacts.email,
      phone: clientContacts.phone,
      isPrimary: clientContacts.isPrimary
    })
    .from(clientContacts)
    .where(eq(clientContacts.clientId, clientId))
    .orderBy(desc(clientContacts.isPrimary));

  const addresses = await db
    .select({
      id: clientAddresses.id,
      label: clientAddresses.label,
      line1: clientAddresses.line1,
      line2: clientAddresses.line2,
      suburb: clientAddresses.suburb,
      state: clientAddresses.state,
      postcode: clientAddresses.postcode,
      country: clientAddresses.country
    })
    .from(clientAddresses)
    .where(eq(clientAddresses.clientId, clientId));

  const activityRows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      actorName: users.name,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorUserId))
    .where(
      and(
        eq(auditEvents.organisationId, actor.organisationId),
        eq(auditEvents.entityType, "client"),
        eq(auditEvents.entityId, clientId)
      )
    )
    .orderBy(desc(auditEvents.createdAt))
    .limit(20);

  return {
    client: {
      id: client.id,
      type: client.type,
      displayName: client.displayName,
      firstName: client.firstName,
      lastName: client.lastName,
      organisationName: client.organisationName,
      email: client.email,
      phone: client.phone,
      abn: client.abn,
      status: client.status,
      riskRating: client.riskRating,
      source: client.source,
      notes: client.notes,
      createdAt: client.createdAt.toISOString()
    },
    matters: matterList,
    contacts,
    addresses,
    activity: activityRows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString()
    }))
  };
}

export interface CreateClientInput {
  type: "individual" | "organisation";
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  organisationName: string | null;
  email: string | null;
  phone: string | null;
  abn: string | null;
  riskRating: "low" | "medium" | "high";
  source: string | null;
  notes: string | null;
}

export async function createClient(
  db: VeyraDb,
  actor: Actor,
  input: CreateClientInput
): Promise<{ id: string }> {
  assertPermission(actor, "client:create");

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(clients)
      .values({
        organisationId: actor.organisationId,
        type: input.type,
        displayName: input.displayName,
        firstName: input.firstName,
        lastName: input.lastName,
        organisationName: input.organisationName,
        email: input.email,
        phone: input.phone,
        abn: input.abn,
        riskRating: input.riskRating,
        source: input.source,
        notes: input.notes,
        createdBy: actor.userId
      })
      .returning({ id: clients.id });

    const client = inserted[0];
    if (!client) throw new Error("Client insert returned no row");

    await recordAudit(tx, actor, {
      action: "client.created",
      entityType: "client",
      entityId: client.id,
      metadata: { displayName: input.displayName, type: input.type }
    });

    return client;
  });
}

export interface UpdateClientInput {
  displayName?: string | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  riskRating?: "low" | "medium" | "high" | undefined;
  notes?: string | null | undefined;
  status?: "active" | "archived" | undefined;
}

export async function updateClient(
  db: VeyraDb,
  actor: Actor,
  clientId: string,
  patch: UpdateClientInput
): Promise<void> {
  assertPermission(actor, "client:update");
  if (patch.status === "archived") assertPermission(actor, "client:archive");

  const existing = await db
    .select({ id: clients.id, status: clients.status })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organisationId, actor.organisationId)))
    .limit(1);
  if (!existing[0]) throw notFound("Client not found");

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.displayName !== undefined) values.displayName = patch.displayName;
  if (patch.email !== undefined) values.email = patch.email;
  if (patch.phone !== undefined) values.phone = patch.phone;
  if (patch.riskRating !== undefined) values.riskRating = patch.riskRating;
  if (patch.notes !== undefined) values.notes = patch.notes;
  if (patch.status !== undefined) {
    values.status = patch.status;
    values.archivedAt = patch.status === "archived" ? new Date() : null;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(clients)
      .set(values)
      .where(and(eq(clients.id, clientId), eq(clients.organisationId, actor.organisationId)));

    await recordAudit(tx, actor, {
      action: patch.status === "archived" ? "client.archived" : "client.updated",
      entityType: "client",
      entityId: clientId,
      metadata: {
        fields: Object.keys(patch).filter((key) => patch[key as keyof UpdateClientInput] !== undefined)
      }
    });
  });
}
