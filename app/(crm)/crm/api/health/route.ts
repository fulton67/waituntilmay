import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { databaseMode, getDb } from "@/crm/db";

/**
 * Deployment check: runs one query from this function against DATABASE_URL. Reports which
 * Supabase project the database belongs to and how long the query took — no row data.
 */
export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const project = url.match(/postgres\.([a-z0-9]{20})[:@]/)?.[1] ?? url.match(/db\.([a-z0-9]{20})\.supabase\.co/)?.[1] ?? null;
  const started = Date.now();
  try {
    const db = await getDb();
    const [row] = await db.execute<{ migrations: number }>(sql`select count(*)::int as migrations from drizzle.__drizzle_migrations`);
    return NextResponse.json(
      { db: "ok", mode: databaseMode(), project, migrations: row?.migrations ?? null, ms: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[crm health] database unreachable:", err instanceof Error ? err.message : err);
    return NextResponse.json({ db: "unreachable", mode: databaseMode(), project, ms: Date.now() - started }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
