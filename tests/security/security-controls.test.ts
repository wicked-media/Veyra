import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  changePassword,
  getSessionContext,
  signIn,
  signOut,
  type SessionContext
} from "@veyra/core";
import { hashSessionToken, verifyPassword } from "@veyra/auth";
import { auditEvents, sessions, type DatabaseHandle } from "@veyra/database";
import { handleApiRequest, implementedRoutes, openApiDocument } from "@veyra/api";
import {
  createClientFixture,
  createFirm,
  createMember,
  createMatterFixture,
  createTestDatabase,
  TEST_PASSWORD,
  type TestFirm,
  type TestUser
} from "../helpers";

let handle: DatabaseHandle;
let firm: TestFirm;
let otherFirm: TestFirm;
let owner: TestUser;
let solicitor: TestUser;
let otherOwner: TestUser;

beforeAll(async () => {
  handle = await createTestDatabase();
  const db = handle.db;

  firm = await createFirm(db, { name: "Security Test Firm", slug: "security-test", prefix: "SEC" });
  otherFirm = await createFirm(db, { name: "Other Firm", slug: "other-firm", prefix: "OTH" });
  owner = await createMember(db, firm, {
    email: "owner@security.test",
    name: "Olivia Owner",
    role: "owner"
  });
  solicitor = await createMember(db, firm, {
    email: "solicitor@security.test",
    name: "Simon Solicitor",
    role: "solicitor"
  });
  otherOwner = await createMember(db, otherFirm, {
    email: "owner@other.test",
    name: "Owen Other",
    role: "owner"
  });
});

afterAll(async () => {
  await handle.close();
});

async function signInFixture(): Promise<SessionContext & { token: string }> {
  const result = await signIn(
    handle.db,
    { email: solicitor.email, password: TEST_PASSWORD },
    { ip: "203.0.113.10", userAgent: "vitest" }
  );
  return result;
}

describe("password and session security", () => {
  it("stores only a hash of the session token", async () => {
    const result = await signInFixture();
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);

    const rows = await handle.db
      .select({ tokenHash: sessions.tokenHash })
      .from(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(result.token)));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).not.toBe(result.token);
  });

  it("verifies passwords without storing plaintext", async () => {
    const rows = await handle.db
      .select({ passwordHash: sql<string>`password_hash` })
      .from(sql`users`)
      .where(sql`email = ${solicitor.email}`)
      .limit(1);

    const hash = rows[0]?.passwordHash;
    expect(hash).toBeTruthy();
    expect(hash).not.toContain(TEST_PASSWORD);
    expect(await verifyPassword(TEST_PASSWORD, hash ?? "")).toBe(true);
    expect(await verifyPassword("WrongPassword123!", hash ?? "")).toBe(false);
  });

  it("returns the same message for an unknown email and a wrong password", async () => {
    const wrongPassword = await signIn(
      handle.db,
      { email: solicitor.email, password: "NotThePassword123" },
      { ip: "203.0.113.11" }
    ).catch((error: unknown) => error);
    const unknownEmail = await signIn(
      handle.db,
      { email: "nobody@security.test", password: "NotThePassword123" },
      { ip: "203.0.113.12" }
    ).catch((error: unknown) => error);

    expect(wrongPassword).toMatchObject({ code: "UNAUTHENTICATED" });
    expect(unknownEmail).toMatchObject({ code: "UNAUTHENTICATED" });
    expect((wrongPassword as Error).message).toBe((unknownEmail as Error).message);
  });

  it("resolves a live session and rejects it after sign-out", async () => {
    const result = await signInFixture();
    const context = await getSessionContext(handle.db, result.token);
    expect(context?.actor.userId).toBe(solicitor.id);
    expect(context?.actor.organisationId).toBe(firm.id);

    await signOut(handle.db, result.token);
    expect(await getSessionContext(handle.db, result.token)).toBeNull();
  });

  it("revokes other sessions on password change but keeps the current one", async () => {
    const first = await signInFixture();
    const second = await signInFixture();

    await changePassword(handle.db, first.actor, {
      currentPassword: TEST_PASSWORD,
      newPassword: "Veyra!ChangedPassword2026"
    });

    expect(await getSessionContext(handle.db, second.token)).toBeNull();
    expect(await getSessionContext(handle.db, first.token)).not.toBeNull();
  });

  it("rate-limits repeated failed sign-ins", async () => {
    const email = "rate-limit@security.test";
    let lastError: unknown;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      try {
        await signIn(
          handle.db,
          { email, password: "WrongPassword123!" },
          { ip: "198.51.100.77" }
        );
      } catch (error) {
        lastError = error;
      }
    }
    expect(lastError).toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });
});

describe("audit immutability", () => {
  it("rejects updates, deletes and truncation of audit history", async () => {
    await handle.db.insert(auditEvents).values({
      organisationId: firm.id,
      actorUserId: owner.id,
      action: "test.audit_created",
      entityType: "matter"
    });

    await expect(
      handle.db.execute(sql`update audit_events set action = 'forged' where action = 'test.audit_created'`)
    ).rejects.toBeDefined();

    await expect(
      handle.db.execute(sql`delete from audit_events where action = 'test.audit_created'`)
    ).rejects.toBeDefined();

    await expect(handle.db.execute(sql`truncate table audit_events`)).rejects.toBeDefined();

    const rows = await handle.db
      .select({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.action, "test.audit_created"));
    expect(rows).toHaveLength(1);
  });
});

describe("REST API controls", () => {
  const appUrl = "http://app.veyra.test";

  function apiRequest(path: string, init: RequestInit = {}): Request {
    return new Request(`${appUrl}/api/v1${path}`, init);
  }

  it("rejects a cross-origin mutation", async () => {
    const response = await handleApiRequest(
      apiRequest("/clients", {
        method: "POST",
        headers: { origin: "https://evil.test", "content-type": "application/json" },
        body: JSON.stringify({ type: "individual", displayName: "Cross Origin" })
      }),
      { db: handle.db, actor: owner.actor, appUrl, requestId: "test-cross-origin" }
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("accepts a same-origin mutation and returns no-store JSON", async () => {
    const response = await handleApiRequest(
      apiRequest("/clients", {
        method: "POST",
        headers: { origin: appUrl, "content-type": "application/json" },
        body: JSON.stringify({ type: "individual", displayName: "API Created Client" })
      }),
      { db: handle.db, actor: owner.actor, appUrl, requestId: "test-create-client" }
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as { data: { id: string } };
    expect(body.data.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects an invalid body with a validation error", async () => {
    const response = await handleApiRequest(
      apiRequest("/matters", {
        method: "POST",
        headers: { origin: appUrl, "content-type": "application/json" },
        body: JSON.stringify({ title: "missing everything else" })
      }),
      { db: handle.db, actor: owner.actor, appUrl, requestId: "test-invalid" }
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION");
  });

  it("prevents cross-tenant reads through the API", async () => {
    const client = await createClientFixture(handle.db, otherFirm, {
      displayName: "Other Tenant Client"
    });
    const matter = await createMatterFixture(handle.db, otherFirm, {
      clientId: client.id,
      responsibleUserId: otherOwner.id,
      matterNumber: "OTH-2026-0001",
      title: "Other tenant matter"
    });

    const response = await handleApiRequest(
      apiRequest(`/matters/${matter.id}`, { headers: { accept: "application/json" } }),
      { db: handle.db, actor: owner.actor, appUrl, requestId: "test-tenant-read" }
    );

    expect(response.status).toBe(404);
  });

  it("enforces audit permission on the API surface", async () => {
    const forbidden = await handleApiRequest(apiRequest("/audit"), {
      db: handle.db,
      actor: solicitor.actor,
      appUrl,
      requestId: "test-audit-forbidden"
    });
    expect(forbidden.status).toBe(403);

    const allowed = await handleApiRequest(apiRequest("/audit"), {
      db: handle.db,
      actor: owner.actor,
      appUrl,
      requestId: "test-audit-allowed"
    });
    expect(allowed.status).toBe(200);
  });

  it("documents every implemented route in the OpenAPI contract", () => {
    for (const [method, path] of implementedRoutes) {
      const paths = openApiDocument.paths as Record<
        string,
        Record<string, unknown> | undefined
      >;
      expect(paths[path], `missing path ${path}`).toBeDefined();
      expect(paths[path]?.[method], `missing ${method.toUpperCase()} ${path}`).toBeDefined();
    }
  });
});
