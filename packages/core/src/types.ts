import type { Permission, Role } from "@veyra/contracts";
import { permissionsForRole } from "@veyra/auth";
import type { VeyraDb, VeyraSchema } from "@veyra/database";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";

/**
 * A fully resolved server-side identity. It is always built from a validated
 * session and active membership; clients never supply organisation or role.
 */
export interface Actor {
  userId: string;
  organisationId: string;
  organisationName: string;
  membershipId: string;
  sessionId: string | null;
  role: Role;
  name: string;
  email: string;
  permissions: readonly Permission[];
  ip: string | null;
  userAgent: string | null;
}

export interface BuildActorInput {
  userId: string;
  organisationId: string;
  organisationName: string;
  membershipId: string;
  sessionId?: string | null;
  role: Role;
  name: string;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}

export function buildActor(input: BuildActorInput): Actor {
  return {
    userId: input.userId,
    organisationId: input.organisationId,
    organisationName: input.organisationName,
    membershipId: input.membershipId,
    sessionId: input.sessionId ?? null,
    role: input.role,
    name: input.name,
    email: input.email,
    permissions: permissionsForRole(input.role),
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null
  };
}

export type DbTransaction = PgTransaction<PgQueryResultHKT, VeyraSchema>;
export type DbExecutor = VeyraDb | DbTransaction;

export interface OrganisationMembershipSummary {
  organisationId: string;
  organisationName: string;
  role: Role;
}
