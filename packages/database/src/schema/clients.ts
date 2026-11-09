import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { users } from "./identity";
import { organisations } from "./tenancy";

export const clientType = pgEnum("client_type", ["individual", "organisation"]);
export const clientStatus = pgEnum("client_status", ["active", "archived"]);
export const riskRating = pgEnum("risk_rating", ["low", "medium", "high"]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    type: clientType("type").notNull(),
    displayName: text("display_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    organisationName: text("organisation_name"),
    email: text("email"),
    phone: text("phone"),
    abn: text("abn"),
    status: clientStatus("status").notNull().default("active"),
    riskRating: riskRating("risk_rating").notNull().default("low"),
    source: text("source"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true })
  },
  (table) => [
    index("clients_org_idx").on(table.organisationId),
    index("clients_org_status_idx").on(table.organisationId, table.status),
    index("clients_org_name_idx").on(table.organisationId, table.displayName)
  ]
);

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title"),
    email: text("email"),
    phone: text("phone"),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps
  },
  (table) => [
    index("client_contacts_client_idx").on(table.clientId),
    index("client_contacts_org_idx").on(table.organisationId)
  ]
);

export const clientAddresses = pgTable(
  "client_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Principal"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    suburb: text("suburb"),
    state: text("state"),
    postcode: text("postcode"),
    country: text("country").notNull().default("Australia"),
    ...timestamps
  },
  (table) => [index("client_addresses_client_idx").on(table.clientId)]
);
