import {
  index,
  jsonb,
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

export const aiMessageRole = pgEnum("ai_message_role", ["user", "assistant"]);
export const aiProposalStatus = pgEnum("ai_proposal_status", ["pending", "approved", "rejected"]);
/** Only safe, reviewable actions are permitted. AI cannot file, send or move money. */
export const aiActionType = pgEnum("ai_action_type", ["create_task"]);

export interface AiCitation {
  id: string;
  documentId: string;
  documentTitle: string;
  versionNumber: number;
  ordinal: number;
}

export interface AiProposedTask {
  title: string;
  description: string;
}

export const aiThreads = pgTable(
  "ai_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    index("ai_threads_org_matter_idx").on(table.organisationId, table.matterId),
    index("ai_threads_org_updated_idx").on(table.organisationId, table.updatedAt)
  ]
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => aiThreads.id, { onDelete: "cascade" }),
    role: aiMessageRole("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<AiCitation[]>().notNull().default([]),
    provider: text("provider"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("ai_messages_thread_created_idx").on(table.threadId, table.createdAt)]
);

/**
 * A proposal is not an action. Nothing is written to the practice record until
 * a different authorised human approves it, and only allow-listed action types
 * can ever be approved.
 */
export const aiActionProposals = pgTable(
  "ai_action_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => aiThreads.id, { onDelete: "set null" }),
    messageId: uuid("message_id").references(() => aiMessages.id, { onDelete: "set null" }),
    actionType: aiActionType("action_type").notNull(),
    status: aiProposalStatus("status").notNull().default("pending"),
    payload: jsonb("payload").$type<AiProposedTask>().notNull(),
    proposedBy: uuid("proposed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    ...timestamps
  },
  (table) => [
    index("ai_proposals_org_status_idx").on(table.organisationId, table.status),
    index("ai_proposals_matter_idx").on(table.matterId)
  ]
);

export type AiMessageRole = (typeof aiMessageRole.enumValues)[number];
export type AiProposalStatus = (typeof aiProposalStatus.enumValues)[number];
export type AiActionType = (typeof aiActionType.enumValues)[number];
