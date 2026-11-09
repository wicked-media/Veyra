import { resolveOidcConfiguration, safeReturnTo } from "@veyra/auth";
import {
  buildOidcAuthorizationUrl,
  createOidcTransactionSecrets,
  discoverOidcProvider,
  exchangeOidcCode,
  verifyOidcIdToken
} from "@veyra/auth/oidc";
import {
  createOidcTransaction,
  consumeOidcTransaction,
  signInWithOidcIdentity,
  type RequestMeta,
  type SignInResult
} from "@veyra/core";
import { getDb } from "@/lib/db";

export async function beginOidcSignIn(returnTo: string | null): Promise<string> {
  const configuration = resolveOidcConfiguration();
  if (!configuration.configured) {
    throw new Error(
      `Identity sign-in is not configured. Missing: ${configuration.missing.join(", ")}`
    );
  }

  const metadata = await discoverOidcProvider(configuration);
  const secrets = createOidcTransactionSecrets();
  await createOidcTransaction(await getDb(), {
    state: secrets.state,
    nonce: secrets.nonce,
    codeVerifier: secrets.codeVerifier,
    returnTo: safeReturnTo(returnTo)
  });

  return buildOidcAuthorizationUrl(configuration, metadata, secrets);
}

export interface OidcCallbackResult {
  result: SignInResult;
  returnTo: string;
}

export async function completeOidcSignIn(
  code: string,
  state: string,
  meta: RequestMeta
): Promise<OidcCallbackResult> {
  const configuration = resolveOidcConfiguration();
  if (!configuration.configured) {
    throw new Error(
      `Identity sign-in is not configured. Missing: ${configuration.missing.join(", ")}`
    );
  }

  const metadata = await discoverOidcProvider(configuration);
  const transaction = await consumeOidcTransaction(await getDb(), state);
  const tokens = await exchangeOidcCode(
    configuration,
    metadata,
    code,
    transaction.codeVerifier
  );
  if (!tokens.id_token) throw new Error("The identity provider did not return an identity token");

  const identity = await verifyOidcIdToken(
    configuration,
    metadata,
    tokens.id_token,
    transaction.nonce
  );
  const result = await signInWithOidcIdentity(await getDb(), identity, meta);
  return { result, returnTo: safeReturnTo(transaction.returnTo) };
}
