/**
 * Authentication mode and OIDC policy.
 *
 * Production always resolves to OIDC, even if somebody sets the mode to local.
 * That makes a development-auth bypass impossible to enable accidentally in a
 * production process. Local password authentication remains available in
 * development, tests and explicit non-production evaluation environments.
 */

export type AuthMode = "local" | "oidc";

export function resolveAuthMode(
  env: Record<string, string | undefined> = process.env
): AuthMode {
  if (env.NODE_ENV === "production") return "oidc";
  return env.VEYRA_AUTH_MODE === "oidc" ? "oidc" : "local";
}

export interface OidcConfiguration {
  configured: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  scopes: string;
  providerLabel: string;
  mfaRequired: boolean;
  mfaClaim: "amr" | "acr";
  mfaValues: readonly string[];
  trustUnverifiedEmail: boolean;
  appUrl: string;
  missing: readonly string[];
}

function appUrlFromEnv(env: Record<string, string | undefined>): string {
  const raw = env.VEYRA_APP_URL?.trim() || "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function splitValues(raw: string | undefined, fallback: readonly string[]): readonly string[] {
  if (!raw?.trim()) return fallback;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function resolveOidcConfiguration(
  env: Record<string, string | undefined> = process.env
): OidcConfiguration {
  const issuer = env.VEYRA_OIDC_ISSUER?.trim() ?? "";
  const clientId = env.VEYRA_OIDC_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.VEYRA_OIDC_CLIENT_SECRET?.trim() || null;
  const appUrl = appUrlFromEnv(env);
  const redirectUri =
    env.VEYRA_OIDC_REDIRECT_URI?.trim() || `${appUrl}/api/auth/oidc/callback`;
  const mfaClaim = env.VEYRA_OIDC_MFA_CLAIM === "acr" ? "acr" : "amr";
  const mfaValues = splitValues(
    env.VEYRA_OIDC_MFA_VALUES,
    mfaClaim === "acr"
      ? ["urn:veyra:mfa", "urn:mace:incommon:iap:silver", "urn:mace:incommon:iap:bronze"]
      : ["mfa", "otp", "hwk", "swk"]
  );
  const missing: string[] = [];
  if (!issuer) missing.push("VEYRA_OIDC_ISSUER");
  if (!clientId) missing.push("VEYRA_OIDC_CLIENT_ID");
  if (!/^https?:\/\//.test(issueOrEmpty(issuer))) missing.push("VEYRA_OIDC_ISSUER (absolute URL)");
  if (!/^https?:\/\//.test(redirectUri)) missing.push("VEYRA_OIDC_REDIRECT_URI");

  return {
    configured: missing.length === 0,
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scopes: env.VEYRA_OIDC_SCOPES?.trim() || "openid profile email",
    providerLabel: env.VEYRA_OIDC_LABEL?.trim() || "firm identity provider",
    mfaRequired: env.VEYRA_OIDC_REQUIRE_MFA !== "false",
    mfaClaim,
    mfaValues,
    /** Must be enabled deliberately for an issuer that provides verified identity. */
    trustUnverifiedEmail: env.VEYRA_OIDC_TRUST_EMAIL === "true",
    appUrl,
    missing
  };
}

function issueOrEmpty(value: string): string {
  return value;
}

export class OidcPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OidcPolicyError";
  }
}

export interface OidcIdentity {
  issuer: string;
  subject: string;
  email: string;
  name: string;
  mfaVerified: boolean;
}

function stringClaim(claims: Record<string, unknown>, key: string): string | null {
  const value = claims[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function claimValues(claims: Record<string, unknown>, key: string): string[] {
  const value = claims[key];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

/**
 * Validates claims after the signature, issuer, audience and expiry have been
 * verified by the OIDC verifier. Fails closed on missing email verification,
 * missing MFA and nonce mismatch.
 */
export function assertOidcClaims(
  claims: Record<string, unknown>,
  configuration: OidcConfiguration,
  expectedNonce: string
): OidcIdentity {
  const issuer = stringClaim(claims, "iss");
  const subject = stringClaim(claims, "sub");
  const nonce = stringClaim(claims, "nonce");
  if (!issuer || issuer !== configuration.issuer) {
    throw new OidcPolicyError("The identity token issuer did not match the configured issuer");
  }
  if (!subject) throw new OidcPolicyError("The identity token has no subject");
  if (!nonce || nonce !== expectedNonce) {
    throw new OidcPolicyError("The identity token nonce did not match this sign-in attempt");
  }

  const email = stringClaim(claims, "email") ?? stringClaim(claims, "preferred_username") ??
    stringClaim(claims, "upn");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OidcPolicyError("The identity provider did not return a usable email address");
  }

  const verified = claims.email_verified;
  if (verified === false) {
    throw new OidcPolicyError("The identity provider has not verified this email address");
  }
  if (verified !== true && !configuration.trustUnverifiedEmail) {
    throw new OidcPolicyError(
      "The identity provider did not assert a verified email address; configure VEYRA_OIDC_TRUST_EMAIL only for a trusted issuer"
    );
  }

  const assuranceValues = claimValues(claims, configuration.mfaClaim).map((value) =>
    configuration.mfaClaim === "amr" ? value.toLowerCase() : value
  );
  const mfaVerified = assuranceValues.some((value) =>
    configuration.mfaValues.some((expected) =>
      configuration.mfaClaim === "amr" ? expected.toLowerCase() === value : expected === value
    )
  );
  if (configuration.mfaRequired && !mfaVerified) {
    throw new OidcPolicyError(
      "Multi-factor authentication is required. Complete MFA with your identity provider and try again."
    );
  }

  const name = stringClaim(claims, "name") ?? email.split("@")[0] ?? "User";
  return {
    issuer,
    subject,
    email: email.toLowerCase(),
    name,
    mfaVerified
  };
}

/** Prevents open redirects after a successful provider callback. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  if (value.includes("\n") || value.includes("\r")) return "/dashboard";
  return value.slice(0, 500);
}
