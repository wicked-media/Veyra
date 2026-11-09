import { describe, expect, it } from "vitest";
import { PERMISSIONS, PERMISSION_GROUPS, ROLES, type Permission } from "@veyra/contracts";
import {
  assertOidcClaims,
  hasPermission,
  permissionsForRole,
  resolveAuthMode,
  resolveOidcConfiguration,
  shouldUseSecureCookies
} from "@veyra/auth";
import { AI_CAPABILITIES, assertAiExecutionAllowed, resolveAiConfiguration } from "@veyra/ai";
import { integrationStatuses } from "@veyra/integrations";

describe("permission matrix", () => {
  it("defines every permission exactly once across the documentation groups", () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((permission) => permission.key)
    );
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(grouped)).toEqual(new Set(PERMISSIONS));
  });

  it("gives the owner every permission and no other role owner-level billing cover", () => {
    expect(permissionsForRole("owner")).toHaveLength(PERMISSIONS.length);
    for (const permission of PERMISSIONS) expect(hasPermission("owner", permission)).toBe(true);

    expect(hasPermission("admin", "trust:manage")).toBe(false);
    expect(hasPermission("admin", "org:billing")).toBe(false);
    expect(hasPermission("principal", "trust:manage")).toBe(false);
  });

  it("applies least privilege for operational roles", () => {
    const denied: Array<[Parameters<typeof hasPermission>[0], Permission]> = [
      ["paralegal", "matter:create"],
      ["paralegal", "matter:close"],
      ["paralegal", "billing:read"],
      ["solicitor", "user:manage"],
      ["solicitor", "audit:read"],
      ["accounts", "task:read"],
      ["accounts", "matter:update"],
      ["accounts", "audit:read"]
    ];

    for (const [role, permission] of denied) {
      expect(hasPermission(role, permission), `${role} should not have ${permission}`).toBe(false);
    }

    expect(hasPermission("accounts", "trust:read")).toBe(true);
    expect(hasPermission("accounts", "trust:manage")).toBe(true);
    expect(hasPermission("admin", "user:manage")).toBe(true);
    expect(hasPermission("principal", "matter:manage_access")).toBe(true);
  });

  it("keeps the role list stable", () => {
    expect([...ROLES]).toEqual([
      "owner",
      "admin",
      "principal",
      "solicitor",
      "paralegal",
      "accounts"
    ]);
  });

  it("marks cookies secure on HTTPS and fails closed for public HTTP", () => {
    expect(
      shouldUseSecureCookies({ NODE_ENV: "production", VEYRA_APP_URL: "https://app.veyra.test" })
    ).toBe(true);
    expect(
      shouldUseSecureCookies({ NODE_ENV: "production", VEYRA_APP_URL: "http://localhost:3000" })
    ).toBe(false);
    expect(
      shouldUseSecureCookies({ NODE_ENV: "production", VEYRA_APP_URL: "http://app.veyra.test" })
    ).toBe(true);
    expect(shouldUseSecureCookies({ NODE_ENV: "development" })).toBe(false);
  });
});

describe("AI policy", () => {
  it("does not expose the provider key and never falls back to a mock in production", () => {
    const configuration = resolveAiConfiguration({
      NODE_ENV: "development",
      OPENAI_API_KEY: "sk-do-not-leak-this-value"
    });
    expect(configuration.credentialsPresent).toBe(true);
    expect(configuration.provider).toBe("openai");
    expect(configuration.runtimeEnabled).toBe(true);
    expect(JSON.stringify(configuration)).not.toContain("sk-do-not-leak-this-value");

    expect(resolveAiConfiguration({ NODE_ENV: "production" }).mode).toBe("disabled");
    expect(resolveAiConfiguration({ NODE_ENV: "development" }).mode).toBe("local_extractive");
    expect(resolveAiConfiguration({ NODE_ENV: "production" }).missing).toContain(
      "OPENAI_API_KEY (or non-production local retrieval)"
    );
  });

  it("requires matter access, purpose and the AI permission", () => {
    const configuration = resolveAiConfiguration({ NODE_ENV: "development" });
    expect(() =>
      assertAiExecutionAllowed(
        {
          userId: "user-1",
          organisationId: "org-1",
          permissions: ["matter:read", "ai:use"],
          matterId: "matter-1",
          matterAccessGranted: true,
          purpose: "matter summary"
        },
        configuration
      )
    ).not.toThrow();

    expect(() =>
      assertAiExecutionAllowed(
        {
          userId: "user-1",
          organisationId: "org-1",
          permissions: ["matter:read", "ai:use"],
          matterId: "matter-1",
          matterAccessGranted: false,
          purpose: "matter summary"
        },
        configuration
      )
    ).toThrow(/verified matter access/i);

    expect(() =>
      assertAiExecutionAllowed(
        {
          userId: "user-1",
          organisationId: "org-1",
          permissions: [],
          matterId: null,
          matterAccessGranted: true,
          purpose: ""
        },
        configuration
      )
    ).toThrow();
  });

  it("requires human approval for every listed AI capability", () => {
    expect(AI_CAPABILITIES.length).toBeGreaterThan(0);
    for (const capability of AI_CAPABILITIES) {
      expect(capability.humanApprovalRequired).toBe(true);
    }
  });
});

describe("OIDC policy", () => {
  it("forces production to OIDC even when local auth mode is requested", () => {
    expect(resolveAuthMode({ NODE_ENV: "production", VEYRA_AUTH_MODE: "local" })).toBe("oidc");
    expect(resolveAuthMode({ NODE_ENV: "development", VEYRA_AUTH_MODE: "local" })).toBe("local");
    expect(resolveAuthMode({ NODE_ENV: "development", VEYRA_AUTH_MODE: "oidc" })).toBe("oidc");
  });

  it("fails closed on missing verified email or MFA assurance", () => {
    const configuration = resolveOidcConfiguration({
      VEYRA_OIDC_ISSUER: "https://id.example.test",
      VEYRA_OIDC_CLIENT_ID: "veyra-client",
      VEYRA_APP_URL: "https://app.example.test"
    });
    expect(configuration.configured).toBe(true);

    const baseClaims = {
      iss: "https://id.example.test",
      sub: "subject-1",
      email: "person@example.test",
      email_verified: true,
      nonce: "nonce-1",
      amr: ["pwd", "mfa"]
    };
    expect(assertOidcClaims(baseClaims, configuration, "nonce-1")).toMatchObject({
      email: "person@example.test",
      mfaVerified: true
    });
    expect(() =>
      assertOidcClaims({ ...baseClaims, email_verified: false }, configuration, "nonce-1")
    ).toThrow(/verified/i);
    expect(() =>
      assertOidcClaims({ ...baseClaims, amr: ["pwd"] }, configuration, "nonce-1")
    ).toThrow(/multi-factor/i);
    expect(() =>
      assertOidcClaims({ ...baseClaims, nonce: "replayed" }, configuration, "nonce-1")
    ).toThrow(/nonce/i);
  });
});

describe("integration catalogue", () => {
  it("never claims a connection that is not implemented", () => {
    const statuses = integrationStatuses({
      MICROSOFT_CLIENT_ID: "id",
      MICROSOFT_CLIENT_SECRET: "secret",
      MICROSOFT_TENANT_ID: "tenant"
    });

    expect(statuses.length).toBeGreaterThan(0);
    for (const integration of statuses) {
      expect(integration.connected).toBe(false);
      expect(integration.implemented).toBe(false);
    }

    const microsoft = statuses.find((integration) => integration.slug === "microsoft-365");
    expect(microsoft?.credentialStatus).toBe("all_present");
  });
});
