import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Server-side OIDC transaction. The browser only receives the opaque state;
 * the nonce and PKCE verifier stay here. Transactions are single-use and
 * short-lived, so a replayed callback cannot create another session.
 */
export const oidcTransactions = pgTable(
  "oidc_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stateHash: text("state_hash").notNull(),
    nonce: text("nonce").notNull(),
    codeVerifier: text("code_verifier").notNull(),
    returnTo: text("return_to").notNull().default("/dashboard"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("oidc_transactions_state_idx").on(table.stateHash),
    index("oidc_transactions_expiry_idx").on(table.expiresAt)
  ]
);
