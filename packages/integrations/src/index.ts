/**
 * Integration catalogue shared by administration UI and documentation.
 *
 * `implemented` is intentionally false for every provider in Stage 1. Presence
 * of credentials must not be presented as a working connection.
 */

export type IntegrationAccess = "oauth" | "api_key" | "provider_agreement";

export interface IntegrationDefinition {
  slug: string;
  name: string;
  category: string;
  detail: string;
  envKeys: readonly string[];
  access: IntegrationAccess;
  stage: string;
  implemented: boolean;
}

export const INTEGRATION_CATALOGUE: readonly IntegrationDefinition[] = [
  {
    slug: "microsoft-365",
    name: "Microsoft 365",
    category: "Email & calendar",
    detail:
      "Outlook filing, attachment capture, calendar sync and Word integration through Microsoft Graph with least-privilege scopes.",
    envKeys: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
    access: "oauth",
    stage: "Stage 5",
    implemented: false
  },
  {
    slug: "xero",
    name: "Xero",
    category: "Accounting",
    detail:
      "Invoice export and reconciliation support through the official Xero API. Trust accounting remains internal and gated.",
    envKeys: ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET"],
    access: "oauth",
    stage: "Stage 6",
    implemented: false
  },
  {
    slug: "myob",
    name: "MYOB",
    category: "Accounting",
    detail: "Accounting export and client ledger sync through official MYOB APIs.",
    envKeys: ["MYOB_CLIENT_ID", "MYOB_CLIENT_SECRET"],
    access: "oauth",
    stage: "Stage 6",
    implemented: false
  },
  {
    slug: "research",
    name: "Legal research",
    category: "Research",
    detail:
      "Licensed Australian legislation and case law providers with citation provenance. No scraping of restricted databases.",
    envKeys: [],
    access: "provider_agreement",
    stage: "Stage 6",
    implemented: false
  },
  {
    slug: "e-signature",
    name: "Electronic signatures",
    category: "Documents",
    detail:
      "Provider abstraction for approved e-signature services with envelope audit trails and signer verification.",
    envKeys: [],
    access: "provider_agreement",
    stage: "Stage 7",
    implemented: false
  },
  {
    slug: "pexa",
    name: "PEXA",
    category: "Conveyancing",
    detail:
      "Electronic settlement where commercially approved and technically authorised. Availability must be confirmed before implementation.",
    envKeys: [],
    access: "provider_agreement",
    stage: "Stage 8",
    implemented: false
  }
] as const;

export type CredentialStatus = "all_present" | "missing" | "not_applicable";

export interface IntegrationStatus extends IntegrationDefinition {
  credentialStatus: CredentialStatus;
  connected: false;
}

export function integrationStatuses(
  env: Record<string, string | undefined> = process.env
): IntegrationStatus[] {
  return INTEGRATION_CATALOGUE.map((integration) => {
    const credentialStatus: CredentialStatus =
      integration.envKeys.length === 0
        ? "not_applicable"
        : integration.envKeys.every((key) => Boolean(env[key]?.trim()))
          ? "all_present"
          : "missing";

    return { ...integration, credentialStatus, connected: false };
  });
}
