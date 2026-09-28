import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { AVATAR_COLORS } from "./colors";
import { DEV_COOKIE, readDevToken } from "./dev-session";
import { devAuthEnabled, isAllowed } from "./env";
import { supabaseServer } from "./supabase/server";
import type { Interviewer } from "./types";

export const getSessionEmail = cache(async (): Promise<string | null> => {
  // Always per-request: CRM pages must never be prerendered, whichever auth mode is active.
  await connection();
  if (devAuthEnabled()) {
    const store = await cookies();
    return readDevToken(store.get(DEV_COOKIE)?.value);
  }
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email?.toLowerCase() ?? null;
});

function nameFromEmail(email: string) {
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

export type Viewer =
  | { role: "interviewer"; interviewer: Interviewer }
  | { role: "intern"; candidate: { id: string; name: string; email: string } };

/** A candidate whose email matches — that person signs in as an intern. */
export async function candidateByEmail(email: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.candidates.id, name: schema.candidates.name, email: schema.candidates.email })
    .from(schema.candidates)
    .where(sql`lower(${schema.candidates.email}) = ${email.trim().toLowerCase()}`)
    .orderBy(schema.candidates.seq)
    .limit(1);
  return row ?? null;
}

/** Who is signed in: an interviewer (allowlist), an intern (candidate email), or null (no access). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const email = await getSessionEmail();
  if (!email) return null;
  if (isAllowed(email)) return { role: "interviewer", interviewer: await ensureInterviewer(email) };
  const candidate = await candidateByEmail(email);
  return candidate ? { role: "intern", candidate } : null;
});

/** Pages: signed-out → sign-in; interns → /crm/me; unknown → "Ask Naim for access". */
export async function requireViewer(): Promise<Viewer> {
  const email = await getSessionEmail();
  if (!email) redirect("/crm/sign-in");
  const viewer = await getViewer();
  if (!viewer) redirect("/crm/sign-in?denied=1");
  return viewer;
}

/**
 * The signed-in, allowlisted interviewer. Creates their interviewer row on first sign-in.
 * Redirects to sign-in otherwise. Use in every CRM page and server action.
 */
export const requireInterviewer = cache(async (): Promise<Interviewer> => {
  const viewer = await requireViewer();
  if (viewer.role === "intern") redirect("/crm/me");
  return viewer.interviewer;
});

async function ensureInterviewer(email: string): Promise<Interviewer> {
  const db = await getDb();
  const [row] = await db.select().from(schema.interviewers).where(eq(schema.interviewers.email, email));
  if (row) return { id: row.id, name: row.name, email: row.email, color: row.color };

  const all = await db.select({ id: schema.interviewers.id }).from(schema.interviewers);
  const [created] = await db
    .insert(schema.interviewers)
    .values({ name: nameFromEmail(email), email, color: AVATAR_COLORS[all.length % AVATAR_COLORS.length] })
    .onConflictDoNothing()
    .returning();
  if (created) return { id: created.id, name: created.name, email: created.email, color: created.color };
  const [again] = await db.select().from(schema.interviewers).where(eq(schema.interviewers.email, email));
  return { id: again.id, name: again.name, email: again.email, color: again.color };
}
