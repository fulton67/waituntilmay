import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, schema } from "../db";
import { devAuthEnabled } from "./env";

/**
 * Sliding-window limit stored in Postgres (serverless instances share nothing in memory).
 * Records the attempt and returns false once `limit` attempts have been made in `windowMin`.
 * Off in local mode (no email is sent, and it's never on in production), so e2e runs and the
 * interaction checklist can sign in as often as they like.
 */
export async function allow(bucket: string, limit: number, windowMin: number): Promise<boolean> {
  if (devAuthEnabled()) return true;
  const db = await getDb();
  const since = new Date(Date.now() - windowMin * 60_000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.authAttempts)
    .where(and(eq(schema.authAttempts.bucket, bucket), gt(schema.authAttempts.createdAt, since)));
  if (n >= limit) return false;
  await db.insert(schema.authAttempts).values({ bucket });
  // Opportunistic cleanup: nothing older than a day is ever counted.
  if (Math.random() < 0.05) await db.delete(schema.authAttempts).where(lt(schema.authAttempts.createdAt, new Date(Date.now() - 86_400_000)));
  return true;
}

/** The caller's IP as the platform reports it (first x-forwarded-for hop). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

