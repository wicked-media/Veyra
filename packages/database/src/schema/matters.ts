import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { clients } from "./clients";
import { users } from "./identity";
import { organisations } from "./tenancy";

export const practiceArea = pgEnum("practice_area", [
  "commercial",
  "estates",
  "litigation",
  "family",
  "conveyancing",
  "criminal",
  "employment",
  "property",
  "other"
]);

export const matterStatus = pgEnum("matter_status", ["open", "on_hold", "closed", "archived"]);
export const matterMemberRole = pgEnum("matter_member_role", ["lead", "member", "viewer"]);
export const matterPartyRole = pgEnum("matter_party_role", [
  "client",
  "opposing",
  "counsel",
  "third_party",
  "related"
]);
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "done", "cancelled"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);

export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    matterNumber: text("matter_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    practiceArea: practiceArea("practice_area").notNull(),
    matterType: text("matter_type"),
    status: matterStatus("status").notNull().default("open"),
    stage: text("stage"),
    responsibleUserId: uuid("responsible_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    restricted: boolean("restricted").notNull().default(false),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("matters_org_number_uq").on(table.organisationId, table.matterNumber),
    index("matters_org_status_idx").on(table.organisationId, table.status),
    index("matters_org_client_idx").on(table.organisationId, table.clientId),
    index("matters_responsible_idx").on(table.responsibleUserId)
  ]
);

/** Explicit matter team. Required for access to restricted matters. */
export const matterMembers = pgTable(
  "matter_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: matterMemberRole("role").notNull().default("member"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("matter_members_matter_user_uq").on(table.matterId, table.userId),
    index("matter_members_user_idx").on(table.userId)
  ]
);

/**
 * Ethical wall deny-list. A wall always wins, including for firm owners and
 * administrators, and applies to reads as well as writes.
 */
export const matterWalls = pgTable(
  "matter_walls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("matter_walls_matter_user_uq").on(table.matterId, table.userId),
    index("matter_walls_matter_idx").on(table.matterId)
  ]
);

export const matterParties = pgTable(
  "matter_parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: matterPartyRole("role").notNull(),
    organisation: text("organisation"),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    ...timestamps
  },
  (table) => [index("matter_parties_matter_idx").on(table.matterId)]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id").references(() => matters.id, { onDelete: "cascade" }),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("todo"),
    priority: taskPriority("priority").notNull().default("medium"),
    dueOn: date("due_on", { mode: "string" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    index("tasks_org_status_idx").on(table.organisationId, table.status),
    index("tasks_matter_idx").on(table.matterId),
    index("tasks_assignee_idx").on(table.assigneeUserId),
    index("tasks_due_idx").on(table.organisationId, table.dueOn)
  ]
);

/**
 * Per-firm, per-year matter numbering. The service increments this inside the
 * same transaction as the matter insert, with a row lock, so concurrent opens
 * cannot produce duplicate references.
 */
export const matterSequences = pgTable(
  "matter_sequences",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.organisationId, table.year] })]
);
