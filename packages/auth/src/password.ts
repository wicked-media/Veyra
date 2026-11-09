import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const PARAMS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;

/**
 * Passwords are hashed with scrypt and a per-user random salt.
 * The encoded form is self-describing so parameters can be upgraded later
 * without invalidating existing credentials.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...PARAMS });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url")
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltPart, hashPart] = parts;
  const expected = Buffer.from(hashPart ?? "", "base64url");
  const salt = Buffer.from(saltPart ?? "", "base64url");
  if (expected.length !== KEY_LENGTH || salt.length === 0) return false;

  const params = { N: Number(n), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem };
  if (!Number.isFinite(params.N) || !Number.isFinite(params.r) || !Number.isFinite(params.p)) {
    return false;
  }

  try {
    const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, params);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Generates a high-entropy temporary password for a newly created user. */
export function generateTemporaryPassword(): string {
  const token = randomBytes(18).toString("base64url");
  return `Veyra-${token}`;
}
