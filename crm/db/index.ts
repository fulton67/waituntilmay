import path from "node:path";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Two drivers behind one API:
 * - `postgres://…` / `postgresql://…` → Supabase Postgres via postgres-js (production).
 * - unset or `pglite:<dir>` → embedded PGlite on disk, for local dev and e2e runs without a
 *   Supabase project. PGlite is migrated (and seeded when empty) automatically on first use.
 */
type Cache = { db?: Promise<Db> };
const g = globalThis as unknown as { __crmDb?: Cache };
const cache: Cache = (g.__crmDb ??= {});

export const MIGRATIONS_DIR = path.join(process.cwd(), "crm", "db", "migrations");

export function databaseMode(): "postgres" | "pglite" {
  const url = process.env.DATABASE_URL ?? "";
  return /^postgres(ql)?:\/\//.test(url) ? "postgres" : "pglite";
}

function pgliteDir() {
  const url = process.env.DATABASE_URL ?? "";
  const dir = url.startsWith("pglite:") ? url.slice("pglite:".length) : "crm/.pglite";
  return path.isAbsolute(dir) ? dir : path.join(/*turbopackIgnore: true*/ process.cwd(), dir);
}

async function connect(): Promise<Db> {
  if (databaseMode() === "postgres") {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // prepare:false keeps us compatible with Supabase's transaction pooler (port 6543).
    const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 });
    return drizzle(client, { schema });
  }

  if (process.env.NODE_ENV === "production" && process.env.CRM_DEV_AUTH !== "1") {
    throw new Error("DATABASE_URL must be a postgres:// connection string in production.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(pgliteDir());
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  const typed = db as unknown as Db;

  const [{ count }] = await typed.select({ count: sql<number>`count(*)` }).from(schema.interviewers);
  if (Number(count) === 0) {
    const { seedDatabase } = await import("../lib/seed");
    await seedDatabase(typed);
  }
  return typed;
}

export function getDb(): Promise<Db> {
  if (!cache.db) {
    cache.db = connect().catch((err) => {
      cache.db = undefined;
      throw err;
    });
  }
  return cache.db;
}

export { schema };
