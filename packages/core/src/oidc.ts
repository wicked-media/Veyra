import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import type { VeyraDb } from "@veyra/database";
import { auditEvents, oidcTransactions } from "@veyra/database";
import { safeReturnTo } from "@veyra/auth";
import { validation } from "./errors";
import type { RequestMeta } from "./auth-service";

const OIDC_TRANSACTION_TTL_MS = 10 * 60 * 1000;

export interface OidcTransactionInput {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

function stateHash(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export async function createOidcTransaction(
  db: VeyraDb,
  input: OidcTransactionInput
): Promise<void> {
  await db
    .delete(oidcTransactions)
    .where(lt(oidcTransactions.expiresAt, new Date()));

  await db.insert(oidcTransactions).values({
    stateHash: stateHash(input.state),
    nonce: input.nonce,
    codeVerifier: input.codeVerifier,
    returnTo: safeReturnTo(input.returnTo),
    expiresAt: new Date(Date.now() + OIDC_TRANSACTION_TTL_MS)
  });
}

export interface ConsumedOidcTransaction {
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

/**
 * Atomically consumes a transaction. A replayed callback finds no row because
 * consumedAt is set in the same UPDATE that returns the secrets.
 */
export async function consumeOidcTransaction(
  db: VeyraDb,
  state: string
): Promise<ConsumedOidcTransaction> {
  const rows = await db
    .update(oidcTransactions)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oidcTransactions.stateHash, stateHash(state)),
        isNull(oidcTransactions.consumedAt),
        gt(oidcTransactions.expiresAt, new Date())
      )
    )
    .returning({
      nonce: oidcTransactions.nonce,
      codeVerifier: oidcTransactions.codeVerifier,
      returnTo: oidcTransactions.returnTo
    });

  const transaction = rows[0];
  if (!transaction) {
    throw validation("This sign-in attempt has expired. Start again from the sign-in page.");
  }
  return transaction;
}

export function newOidcState(): string {
  return randomBytes(32).toString("base64url");
}

export async function recordOidcFailure(
  db: VeyraDb,
  reason: string,
  meta: RequestMeta = {}
): Promise<void> {
  await db.insert(auditEvents).values({
    organisationId: null,
    actorUserId: null,
    action: "auth.oidc_failed",
    entityType: "session",
    metadata: { reason: reason.slice(0, 300) },
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null
  });
}
