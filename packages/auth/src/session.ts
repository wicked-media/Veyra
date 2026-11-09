import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "veyra_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Opaque, single-use token placed in the cookie. Only its hash is stored. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function sessionCookieOptions(secure: boolean): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  };
}

export function sessionExpiry(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

/**
 * Secure cookies are used on HTTPS, and in production for any non-local HTTP
 * origin. Localhost remains usable over HTTP for local Docker/preview stacks;
 * a public production HTTP origin still receives Secure cookies, which fails
 * closed until TLS is configured.
 */
export function shouldUseSecureCookies(
  env: Record<string, string | undefined> = process.env
): boolean {
  const appUrl = env.VEYRA_APP_URL?.trim();
  if (!appUrl) return env.NODE_ENV === "production";

  try {
    const url = new URL(appUrl);
    if (url.protocol === "https:") return true;
    const localHost = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
    return env.NODE_ENV === "production" && !localHost;
  } catch {
    return env.NODE_ENV === "production";
  }
}
