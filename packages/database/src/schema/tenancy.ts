import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

/**
 * Organisation is the tenant boundary. Every tenant-owned row carries
 * `organisation_id` and every query must be scoped by it server-side.
 */
export const organisations = pgTable(
  "organisations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("Australia/Sydney"),
    financialYearStartMonth: integer("financial_year_start_month").notNull().default(7),
    matterNumberPrefix: text("matter_number_prefix").notNull().default("MAT"),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("organisations_slug_uq").on(table.slug),
    index("organisations_name_idx").on(table.name)
  ]
);

export const offices = pgTable(
  "offices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    addressLine1: text("address_line1"),
    suburb: text("suburb"),
    state: text("state"),
    postcode: text("postcode"),
    ...timestamps
  },
  (table) => [
    index("offices_org_idx").on(table.organisationId),
    uniqueIndex("offices_org_name_uq").on(table.organisationId, table.name)
  ]
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...timestamps
  },
  (table) => [
    index("departments_org_idx").on(table.organisationId),
    uniqueIndex("departments_org_name_uq").on(table.organisationId, table.name)
  ]
);
