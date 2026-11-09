import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { offices, organisations } from "./tenancy";

export const userRole = pgEnum("user_role", [
  "owner",
  "admin",
  "principal",
  "solicitor",
  "paralegal",
  "accounts"
]);

export const membershipStatus = pgEnum("membership_status", ["active", "suspended"]);
export const authProvider = pgEnum("auth_provider", ["local", "oidc"]);
export const sessionAuthMethod = pgEnum("session_auth_method", ["password", "oidc"]);

/**
 * A person is global; access to a firm is expressed through a membership.
 * Email uniqueness is case-insensitive via a functional index.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    /** Local credentials remain for invited/legacy users; OIDC users are linked. */
    authProvider: authProvider("auth_provider").notNull().default("local"),
    oidcIssuer: text("oidc_issuer"),
    oidcSubject: text("oidc_subject"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${table.email})`),
    uniqueIndex("users_oidc_identity_uq")
      .on(table.oidcIssuer, table.oidcSubject)
      .where(sql`${table.oidcIssuer} is not null and ${table.oidcSubject} is not null`)
  ]
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    officeId: uuid("office_id").references(() => offices.id, { onDelete: "set null" }),
    role: userRole("role").notNull(),
    status: membershipStatus("status").notNull().default("active"),
    title: text("title"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("memberships_org_user_uq").on(table.organisationId, table.userId),
    index("memberships_user_idx").on(table.userId),
    index("memberships_org_role_idx").on(table.organisationId, table.role)
  ]
);

/**
 * Server-side sessions only. The cookie contains a random token; only its
 * SHA-256 hash is persisted, so a database leak does not expose live sessions.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    authMethod: sessionAuthMethod("auth_method").notNull().default("password"),
    mfaVerified: boolean("mfa_verified").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ip: text("ip"),
    userAgent: text("user_agent")
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uq").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt)
  ]
);
