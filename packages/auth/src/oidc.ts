import {
  createHash,
  randomBytes
} from "node:crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload
} from "jose";
import {
  assertOidcClaims,
  OidcPolicyError,
  type OidcConfiguration,
  type OidcIdentity
} from "./oidc-policy";

/**
 * Standards-based OIDC authorization-code flow with PKCE.
 *
 * The provider is selected entirely by server environment. Browser input never
 * chooses an issuer, redirect URI, scope or client. ID tokens are verified
 * against the discovered JWKS; claims policy then enforces verified email and
 * MFA assurance.
 */

export interface OidcProviderMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  token_endpoint_auth_methods_supported?: string[];
}

export interface OidcTransactionSecrets {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface OidcTokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
}

const metadataCache = new Map<string, { expiresAt: number; metadata: OidcProviderMetadata }>();
const METADATA_TTL_MS = 10 * 60 * 1000;

function assertSecureEndpoint(value: string, label: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OidcPolicyError(`${label} is not a valid URL`);
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new OidcPolicyError(`${label} must use HTTPS`);
  }
}

export async function discoverOidcProvider(
  configuration: OidcConfiguration,
  fetchImpl: typeof fetch = fetch
): Promise<OidcProviderMetadata> {
  const cached = metadataCache.get(configuration.issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.metadata;

  assertSecureEndpoint(configuration.issuer, "OIDC issuer");
  const discoveryUrl = `${configuration.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const response = await fetchImpl(discoveryUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) {
    throw new OidcPolicyError(`OIDC discovery failed with status ${response.status}`);
  }
  const body = (await response.json()) as Record<string, unknown>;
  const metadata: OidcProviderMetadata = {
    issuer: typeof body.issuer === "string" ? body.issuer : "",
    authorization_endpoint:
      typeof body.authorization_endpoint === "string" ? body.authorization_endpoint : "",
    token_endpoint: typeof body.token_endpoint === "string" ? body.token_endpoint : "",
    jwks_uri: typeof body.jwks_uri === "string" ? body.jwks_uri : "",
    token_endpoint_auth_methods_supported: Array.isArray(body.token_endpoint_auth_methods_supported)
      ? body.token_endpoint_auth_methods_supported.filter(
          (entry): entry is string => typeof entry === "string"
        )
      : []
  };

  if (metadata.issuer !== configuration.issuer) {
    throw new OidcPolicyError("OIDC discovery returned a different issuer");
  }
  assertSecureEndpoint(metadata.authorization_endpoint, "OIDC authorization endpoint");
  assertSecureEndpoint(metadata.token_endpoint, "OIDC token endpoint");
  assertSecureEndpoint(metadata.jwks_uri, "OIDC JWKS endpoint");

  metadataCache.set(configuration.issuer, {
    expiresAt: Date.now() + METADATA_TTL_MS,
    metadata
  });
  return metadata;
}

export function createOidcTransactionSecrets(): OidcTransactionSecrets {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { state, nonce, codeVerifier, codeChallenge };
}

export function oidcStateHash(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export function buildOidcAuthorizationUrl(
  configuration: OidcConfiguration,
  metadata: OidcProviderMetadata,
  secrets: OidcTransactionSecrets
): string {
  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", configuration.clientId);
  url.searchParams.set("redirect_uri", configuration.redirectUri);
  url.searchParams.set("scope", configuration.scopes);
  url.searchParams.set("state", secrets.state);
  url.searchParams.set("nonce", secrets.nonce);
  url.searchParams.set("code_challenge", secrets.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function tokenAuthHeader(configuration: OidcConfiguration): string {
  return `Basic ${Buffer.from(
    `${configuration.clientId}:${configuration.clientSecret ?? ""}`,
    "utf8"
  ).toString("base64")}`;
}

export async function exchangeOidcCode(
  configuration: OidcConfiguration,
  metadata: OidcProviderMetadata,
  code: string,
  codeVerifier: string,
  fetchImpl: typeof fetch = fetch
): Promise<OidcTokenResponse> {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: configuration.redirectUri,
    client_id: configuration.clientId,
    code_verifier: codeVerifier
  });

  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded"
  };
  if (configuration.clientSecret) {
    headers.authorization = tokenAuthHeader(configuration);
  }

  const response = await fetchImpl(metadata.token_endpoint, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    throw new OidcPolicyError(`The identity provider rejected the sign-in (${response.status})`);
  }

  const body = (await response.json()) as Record<string, unknown>;
  if (typeof body.id_token !== "string" || !body.id_token) {
    throw new OidcPolicyError("The identity provider did not return an identity token");
  }
  return body as OidcTokenResponse;
}

export async function verifyOidcIdToken(
  configuration: OidcConfiguration,
  metadata: OidcProviderMetadata,
  idToken: string,
  expectedNonce: string
): Promise<OidcIdentity> {
  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));
  let payload: JWTPayload;
  try {
    const verified = await jwtVerify(idToken, jwks, {
      issuer: configuration.issuer,
      audience: configuration.clientId,
      clockTolerance: 60
    });
    payload = verified.payload;
  } catch (error) {
    throw new OidcPolicyError(
      `The identity token could not be verified${error instanceof Error ? `: ${error.message}` : ""}`
    );
  }

  return assertOidcClaims(payload as Record<string, unknown>, configuration, expectedNonce);
}

/** Test seam for local OIDC verification without an external provider. */
export function clearOidcMetadataCache(): void {
  metadataCache.clear();
}
