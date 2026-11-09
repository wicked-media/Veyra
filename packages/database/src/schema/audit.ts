import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { users } from "./identity";
import { organisations } from "./tenancy";

/**
 * Append-only audit trail. A database trigger rejects UPDATE and DELETE
 * (migration 0001), so even a compromised application query cannot rewrite
 * history. `entity_id` is text because audited entities are not restricted to
 * UUID identifiers. `matter_id` is intentionally not a foreign key: audit
 * records must survive matter retention changes.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    organisationId: uuid("organisation_id").references(() => organisations.id, {
      onDelete: "restrict"
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    matterId: uuid("matter_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("audit_events_org_created_idx").on(table.organisationId, table.createdAt),
    index("audit_events_entity_idx").on(table.entityType, table.entityId),
    index("audit_events_matter_idx").on(table.matterId)
  ]
);
