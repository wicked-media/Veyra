import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Services query through this structural type. Node-postgres and PGlite expose
 * the same Drizzle query builder surface; the cast below only widens the query
 * result HKT, which differs between the two drivers.
 */
export type VeyraDb = PgDatabase<PgQueryResultHKT, typeof schema>;
export type VeyraSchema = typeof schema;

export interface DatabaseHandle {
  db: VeyraDb;
  kind: "postgres" | "pglite";
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

export interface CreateDatabaseOptions {
  /** External PostgreSQL connection string. Takes precedence when provided. */
  url?: string;
  /** Directory for embedded PGlite. `null` uses a fresh in-memory database. */
  pgliteDir?: string | null;
}

export function findRepositoryRoot(start = process.cwd()): string {
  let current = path.resolve(start);
  for (let depth = 0; depth < 8; depth += 1) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start);
}

/**
 * Resolved at runtime rather than bundled: migration SQL is read by the
 * migrator from disk and must not be turned into a webpack asset. Production
 * artifacts must include `packages/database/migrations` next to the repository
 * marker, or provide the folder via the same layout as the source deploy.
 */
const migrationsFolder = path.join(
  findRepositoryRoot(),
  "packages",
  "database",
  "migrations"
);

export async function createDatabase(options: CreateDatabaseOptions): Promise<DatabaseHandle> {
  if (options.url) {
    const pool = new Pool({ connectionString: options.url, max: 10 });
    const driverDb = drizzleNodePg(pool, { schema });

    return {
      db: driverDb as unknown as VeyraDb,
      kind: "postgres",
      migrate: async () => {
        await migrateNodePg(driverDb, { migrationsFolder });
      },
      close: async () => {
        await pool.end();
      }
    };
  }

  let client: PGlite;
  if (options.pgliteDir === null) {
    client = new PGlite();
  } else {
    const directory =
      options.pgliteDir ?? path.join(findRepositoryRoot(), ".data", "pglite");
    // PGlite creates the database directory but not missing parents. On a fresh
    // checkout `.data` does not exist yet, so create the full path first.
    fs.mkdirSync(directory, { recursive: true });
    client = new PGlite(directory);
  }

  await client.waitReady;
  const driverDb = drizzlePglite(client, { schema });

  return {
    db: driverDb as unknown as VeyraDb,
    kind: "pglite",
    migrate: async () => {
      await migratePglite(driverDb, { migrationsFolder });
    },
    close: async () => {
      await client.close();
    }
  };
}

/** Opens the database configured by the environment. */
export async function openDatabaseFromEnv(): Promise<DatabaseHandle> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return createDatabase({ url });

  const configuredDir = process.env.VEYRA_DB_DIR?.trim();
  const pgliteDir = configuredDir
    ? path.resolve(findRepositoryRoot(), configuredDir)
    : path.join(findRepositoryRoot(), ".data", "pglite");

  return createDatabase({ pgliteDir });
}
