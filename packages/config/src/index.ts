/**
 * Runtime configuration validation shared by processes.
 *
 * Configuration is read at process start, not per request. Failures are
 * explicit: a production process must not silently fall back to a local
 * database or an insecure public origin.
 */

export interface WorkerConfig {
  intervalMs: number;
  databaseUrl: string | null;
  nodeEnv: string;
}

const DEFAULT_WORKER_INTERVAL_MS = 15 * 60 * 1000;
const MINIMUM_WORKER_INTERVAL_MS = 60 * 1000;

function parseInterval(raw: string | undefined): number {
  if (!raw) return DEFAULT_WORKER_INTERVAL_MS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < MINIMUM_WORKER_INTERVAL_MS) {
    throw new Error(`VEYRA_WORKER_INTERVAL_MS must be at least ${MINIMUM_WORKER_INTERVAL_MS}`);
  }
  return Math.floor(value);
}

export function loadWorkerConfig(
  env: Record<string, string | undefined> = process.env
): WorkerConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const databaseUrl = env.DATABASE_URL?.trim() || null;

  if (nodeEnv === "production" && !databaseUrl) {
    throw new Error("DATABASE_URL is required for the worker in production");
  }

  return {
    intervalMs: parseInterval(env.VEYRA_WORKER_INTERVAL_MS),
    databaseUrl,
    nodeEnv
  };
}

export interface AppConfig {
  appUrl: string;
  isProduction: boolean;
}

function isLoopback(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
}

/**
 * Validates the canonical public origin. Production must use HTTPS unless the
 * origin is loopback (local Docker/staging on the same machine).
 */
export function loadAppConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const raw = env.VEYRA_APP_URL?.trim() || "http://localhost:3000";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("VEYRA_APP_URL must be an absolute http(s) URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VEYRA_APP_URL must use http or https");
  }

  const isProduction = env.NODE_ENV === "production";
  if (isProduction && url.protocol !== "https:" && !isLoopback(url.hostname)) {
    throw new Error("VEYRA_APP_URL must use HTTPS outside localhost in production");
  }

  return { appUrl: url.origin, isProduction };
}
