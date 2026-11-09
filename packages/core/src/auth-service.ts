import { and, asc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import {
  checkRateLimit,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  resolveAuthMode,
  resolveOidcConfiguration,
  sessionExpiry,
  verifyPassword,
  type OidcIdentity
} from "@veyra/auth";
import type { Role } from "@veyra/contracts";
import type { VeyraDb } from "@veyra/database";
import {
  auditEvents,
  memberships,
  organisations,
  sessions,
  users
} from "@veyra/database";
import { recordAudit } from "./audit";
import { notFound, rateLimited, unauthenticated, validation } from "./errors";
import {
  buildActor,
  type Actor,
  type DbExecutor,
  type OrganisationMembershipSummary
} from "./types";

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface SessionAuth {
  method: "password" | "oidc";
  mfaVerified: boolean;
}

export interface SessionContext {
  actor: Actor;
  memberships: OrganisationMembershipSummary[];
  mustChangePassword: boolean;
  auth: SessionAuth;
}

export interface SignInResult extends SessionContext {
  token: string;
  expiresAt: Date;
}

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("veyra-invalid-credential-placeholder");
  return dummyHashPromise;
}

/** Verifies credentials and creates a database-backed session. */
async function establishSession(
  db: DbExecutor,
  user: {
    id: string;
    name: string;
    email: string;
    mustChangePassword: boolean;
  },
  meta: RequestMeta,
  auth: SessionAuth
): Promise<SignInResult> {
  const ip = meta.ip ?? null;
  const userAgent = meta.userAgent ?? null;

  const membershipRows = await db
    .select({
      organisationId: organisations.id,
      organisationName: organisations.name,
      role: memberships.role,
      membershipId: memberships.id
    })
    .from(memberships)
    .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.status, "active"),
        isNull(organisations.archivedAt)
      )
    )
    .orderBy(asc(memberships.joinedAt));

  const membership = membershipRows[0];
  if (!membership) {
    throw unauthenticated("This account does not have access to an active firm");
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = sessionExpiry();

  const sessionRows = await db
    .insert(sessions)
    .values({
      tokenHash,
      userId: user.id,
      organisationId: membership.organisationId,
      authMethod: auth.method,
      mfaVerified: auth.mfaVerified,
      expiresAt,
      ip,
      userAgent
    })
    .returning({ id: sessions.id });
  const session = sessionRows[0];
  if (!session) throw new Error("Session insert returned no row");

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const actor = buildActor({
    userId: user.id,
    organisationId: membership.organisationId,
    organisationName: membership.organisationName,
    membershipId: membership.membershipId,
    sessionId: session.id,
    role: membership.role,
    name: user.name,
    email: user.email,
    ip,
    userAgent
  });

  await recordAudit(db, actor, {
    action: "auth.signed_in",
    entityType: "session",
    entityId: session.id,
    metadata: { method: auth.method, mfaVerified: auth.mfaVerified }
  });

  return {
    actor,
    token,
    expiresAt,
    mustChangePassword: user.mustChangePassword,
    memberships: membershipRows,
    auth
  };
}

export async function signIn(
  db: DbExecutor,
  input: { email: string; password: string },
  meta: RequestMeta = {}
): Promise<SignInResult> {
  if (resolveAuthMode() !== "local") {
    throw unauthenticated("Use your firm's identity provider to sign in");
  }

  const email = input.email.trim().toLowerCase();
  const ip = meta.ip ?? null;
  const userAgent = meta.userAgent ?? null;

  const limit = checkRateLimit(`signin:${ip ?? "unknown"}:${email}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000
  });
  if (!limit.allowed) throw rateLimited("Too many sign-in attempts. Try again in a few minutes.");

  const userRows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const user = userRows[0];

  const passwordValid = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await getDummyHash())
  );

  if (!user || !passwordValid || !user.isActive) {
    await db.insert(auditEvents).values({
      organisationId: null,
      actorUserId: user?.id ?? null,
      action: "auth.sign_in_failed",
      entityType: "user",
      entityId: user?.id ?? null,
      metadata: { reason: "invalid_credentials" },
      ip,
      userAgent
    });
    throw unauthenticated("Email or password is incorrect");
  }

  return establishSession(db, user, { ip, userAgent }, { method: "password", mfaVerified: false });
}

/**
 * Signs in an identity that has already passed OIDC signature and claims
 * policy. Accounts are never auto-provisioned: a firm administrator must have
 * invited the person first. Linking is one-to-one per issuer/subject.
 */
export async function signInWithOidcIdentity(
  db: VeyraDb,
  identity: OidcIdentity,
  meta: RequestMeta = {}
): Promise<SignInResult> {
  const ip = meta.ip ?? null;
  const userAgent = meta.userAgent ?? null;
  const limit = checkRateLimit(`oidc:${ip ?? "unknown"}:${identity.subject}`, {
    limit: 12,
    windowMs: 15 * 60 * 1000
  });
  if (!limit.allowed) throw rateLimited("Too many sign-in attempts. Try again shortly.");

  const configuration = resolveOidcConfiguration();
  if (configuration.configured && configuration.issuer !== identity.issuer) {
    throw unauthenticated("The identity provider is not recognised by this firm");
  }
  if (configuration.mfaRequired && !identity.mfaVerified) {
    throw unauthenticated("Multi-factor authentication is required");
  }

  const linkedRows = await db
    .select()
    .from(users)
    .where(and(eq(users.oidcIssuer, identity.issuer), eq(users.oidcSubject, identity.subject)))
    .limit(1);

  let user = linkedRows[0];
  if (!user) {
    const emailRows = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${identity.email}`)
      .limit(1);
    user = emailRows[0];
    if (user?.oidcSubject && user.oidcIssuer !== identity.issuer) {
      throw unauthenticated("This account is already linked to another identity provider");
    }
    if (user?.oidcSubject && user.oidcSubject !== identity.subject) {
      throw unauthenticated("This account is already linked to another identity");
    }
  }

  if (!user || !user.isActive) {
    await db.insert(auditEvents).values({
      organisationId: null,
      actorUserId: user?.id ?? null,
      action: "auth.oidc_sign_in_failed",
      entityType: "user",
      entityId: user?.id ?? null,
      metadata: { reason: "no_active_linked_account", issuer: identity.issuer },
      ip,
      userAgent
    });
    throw unauthenticated(
      "No active Veyra account is linked to this identity. Ask your firm administrator to invite you."
    );
  }

  await db
    .update(users)
    .set({
      authProvider: "oidc",
      oidcIssuer: identity.issuer,
      oidcSubject: identity.subject,
      mustChangePassword: false,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  const result = await establishSession(
    db,
    { ...user, mustChangePassword: false },
    { ip, userAgent },
    { method: "oidc", mfaVerified: identity.mfaVerified }
  );

  await recordAudit(db, result.actor, {
    action: "auth.oidc_linked",
    entityType: "user",
    entityId: user.id,
    metadata: { issuer: identity.issuer, mfaVerified: identity.mfaVerified }
  });

  return result;
}

export async function getSessionContext(
  db: DbExecutor,
  token: string | undefined | null,
  meta: RequestMeta = {}
): Promise<SessionContext | null> {
  if (!token) return null;

  const tokenHash = hashSessionToken(token);

  const rows = await db
    .select({
      sessionId: sessions.id,
      organisationId: sessions.organisationId,
      organisationName: organisations.name,
      membershipId: memberships.id,
      role: memberships.role,
      userId: users.id,
      name: users.name,
      email: users.email,
      mustChangePassword: users.mustChangePassword,
      authMethod: sessions.authMethod,
      mfaVerified: sessions.mfaVerified
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(organisations, eq(organisations.id, sessions.organisationId))
    .innerJoin(
      memberships,
      and(
        eq(memberships.userId, sessions.userId),
        eq(memberships.organisationId, sessions.organisationId)
      )
    )
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        eq(users.isActive, true),
        eq(memberships.status, "active"),
        isNull(organisations.archivedAt)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const membershipRows = await db
    .select({
      organisationId: organisations.id,
      organisationName: organisations.name,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
    .where(
      and(
        eq(memberships.userId, row.userId),
        eq(memberships.status, "active"),
        isNull(organisations.archivedAt)
      )
    );

  const actor = buildActor({
    userId: row.userId,
    organisationId: row.organisationId,
    organisationName: row.organisationName,
    membershipId: row.membershipId,
    sessionId: row.sessionId,
    role: row.role,
    name: row.name,
    email: row.email,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null
  });

  return {
    actor,
    memberships: membershipRows,
    mustChangePassword: row.mustChangePassword,
    auth: { method: row.authMethod, mfaVerified: row.mfaVerified }
  };
}

export async function signOut(db: DbExecutor, token: string | undefined | null): Promise<void> {
  if (!token) return;
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashSessionToken(token)));
}

export async function switchOrganisation(
  db: DbExecutor,
  token: string | undefined | null,
  organisationId: string
): Promise<void> {
  if (!token) throw unauthenticated();

  const context = await getSessionContext(db, token);
  if (!context) throw unauthenticated();

  const membership = context.memberships.find((row) => row.organisationId === organisationId);
  if (!membership) throw notFound("Firm not found");

  await db
    .update(sessions)
    .set({ organisationId })
    .where(eq(sessions.tokenHash, hashSessionToken(token)));

  await db.insert(auditEvents).values({
    organisationId,
    actorUserId: context.actor.userId,
    action: "auth.organisation_switched",
    entityType: "session",
    entityId: context.actor.sessionId,
    metadata: { fromOrganisationId: context.actor.organisationId, toOrganisationId: organisationId },
    ip: context.actor.ip,
    userAgent: context.actor.userAgent
  });
}

export async function changePassword(
  db: VeyraDb,
  actor: Actor,
  input: { currentPassword: string; newPassword: string }
): Promise<void> {
  const rows = await db.select().from(users).where(eq(users.id, actor.userId)).limit(1);
  const user = rows[0];
  if (!user) throw unauthenticated();

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw validation("Your current password is incorrect");

  if (input.currentPassword === input.newPassword) {
    throw validation("Choose a password different from your current one");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, actor.userId));

    const revokeConditions = [eq(sessions.userId, actor.userId), isNull(sessions.revokedAt)];
    if (actor.sessionId) revokeConditions.push(ne(sessions.id, actor.sessionId));
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(...revokeConditions));

    await recordAudit(tx, actor, {
      action: "auth.password_changed",
      entityType: "user",
      entityId: actor.userId
    });
  });
}

/** Used by ops and tests; returns every firm the user can switch to. */
export async function listUserMemberships(
  db: DbExecutor,
  userId: string
): Promise<OrganisationMembershipSummary[]> {
  return db
    .select({
      organisationId: organisations.id,
      organisationName: organisations.name,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
        isNull(organisations.archivedAt)
      )
    );
}

export type { Role };
