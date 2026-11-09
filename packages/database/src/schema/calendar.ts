import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { users } from "./identity";
import { matters } from "./matters";
import { organisations } from "./tenancy";

export const calendarEventType = pgEnum("calendar_event_type", [
  "hearing",
  "court_date",
  "meeting",
  "internal",
  "other"
]);

export const deadlineCategory = pgEnum("deadline_category", [
  "limitation",
  "filing",
  "court",
  "statutory",
  "internal"
]);

export const deadlineStatus = pgEnum("deadline_status", ["open", "met", "missed", "waived"]);

export const deadlineVerification = pgEnum("deadline_verification", [
  "unverified",
  "verified"
]);

/**
 * Firm and matter calendar entries. Matter entries inherit the same access
 * checks as the matter, including restricted teams and ethical walls.
 */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id").references(() => matters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    eventType: calendarEventType("event_type").notNull().default("other"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    location: text("location"),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    index("calendar_events_org_start_idx").on(table.organisationId, table.startsAt),
    index("calendar_events_matter_idx").on(table.matterId)
  ]
);

/**
 * Consequential dates are deliberately separate from ordinary calendar events.
 * A deadline starts unverified; a human must explicitly confirm it before the
 * interface treats it as verified. Veyra does not silently compute limitation
 * dates or claim legal correctness.
 */
export const deadlines = pgTable(
  "deadlines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: deadlineCategory("category").notNull().default("internal"),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    status: deadlineStatus("status").notNull().default("open"),
    verification: deadlineVerification("verification").notNull().default("unverified"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    index("deadlines_org_due_idx").on(table.organisationId, table.dueOn),
    index("deadlines_matter_idx").on(table.matterId),
    index("deadlines_org_status_idx").on(table.organisationId, table.status)
  ]
);

export type CalendarEventType = (typeof calendarEventType.enumValues)[number];
export type DeadlineCategory = (typeof deadlineCategory.enumValues)[number];
export type DeadlineStatus = (typeof deadlineStatus.enumValues)[number];
export type DeadlineVerification = (typeof deadlineVerification.enumValues)[number];
