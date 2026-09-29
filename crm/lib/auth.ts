import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { eq, gt, and, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { AVATAR_COLORS } from "./colors";
import { DEV_COOKIE, readDevToken } from "./dev-session";
import { devAuthEnabled, isOwner } from "./env";
import { inviteValid } from "./invites";
import { supabaseServer } from "./supabase/server";
import { EMPTY_RESUME, type Interviewer } from "./types";

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

const norm = (email: string) => email.trim().toLowerCase();
const toInterviewer = (r: typeof schema.interviewers.$inferSelect): Interviewer => ({ id: r.id, name: r.name, email: r.email, color: r.color });

export type Viewer =
  | { role: "interviewer"; interviewer: Interviewer }
  | { role: "intern"; candidate: { id: string; name: string; email: string } };

/** Why a signed-in email has no access: never invited, or removed from Settings. */
export type NoAccess = "denied" | "removed";

/** A candidate whose email matches — that person signs in as an intern. */
export async function candidateByEmail(email: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.candidates.id, name: schema.candidates.name, email: schema.candidates.email })
    .from(schema.candidates)
    .where(sql`lower(${schema.candidates.email}) = ${norm(email)}`)
    .orderBy(schema.candidates.seq)
    .limit(1);
  return row ?? null;
}

async function interviewerRow(email: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.interviewers).where(sql`lower(${schema.interviewers.email}) = ${norm(email)}`);
  return row ?? null;
}

/**
 * The role comes from which table the email is in: owners (CRM_ALLOWED_EMAILS) and anyone on the
 * interviewers table (not removed) are interviewers; an email on a candidate is an intern.
 */
export async function accessFor(email: string): Promise<Viewer | { role: null; reason: NoAccess }> {
  if (isOwner(email)) return { role: "interviewer", interviewer: await ensureOwner(email) };
  const row = await interviewerRow(email);
  if (row && !row.removedAt) return { role: "interviewer", interviewer: toInterviewer(row) };
  const candidate = await candidateByEmail(email);
  if (candidate) return { role: "intern", candidate };
  return { role: null, reason: row ? "removed" : "denied" };
}

/** Who is signed in: an interviewer, an intern, or null (no access). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const email = await getSessionEmail();
  if (!email) return null;
  const access = await accessFor(email);
  return access.role ? access : null;
});

/**
 * Pages: signed-out → sign-in. Signed in without access (never invited, or removed since) → the
 * sign-out route, which ends the session and explains why on the sign-in page.
 */
export async function requireViewer(): Promise<Viewer> {
  const email = await getSessionEmail();
  if (!email) redirect("/crm/sign-in");
  const access = await accessFor(email);
  if (!access.role) redirect(`/crm/auth/sign-out?error=${access.reason}`);
  return access;
}

/** The signed-in interviewer; interns are sent to /crm/me. Use in every interviewer page. */
export const requireInterviewer = cache(async (): Promise<Interviewer> => {
  const viewer = await requireViewer();
  if (viewer.role === "intern") redirect("/crm/me");
  return viewer.interviewer;
});

async function nextColor() {
  const db = await getDb();
  const all = await db.select({ id: schema.interviewers.id }).from(schema.interviewers);
  return AVATAR_COLORS[all.length % AVATAR_COLORS.length];
}

/** Owners always have an interviewer row, created on first sign-in and never left removed. */
async function ensureOwner(email: string): Promise<Interviewer> {
  const db = await getDb();
  const row = await interviewerRow(email);
  if (row) {
    if (row.removedAt) await db.update(schema.interviewers).set({ removedAt: null }).where(eq(schema.interviewers.id, row.id));
    return toInterviewer(row);
  }
  await db
    .insert(schema.interviewers)
    .values({ name: nameFromEmail(email), email: norm(email), color: await nextColor() })
    .onConflictDoNothing();
  return toInterviewer((await interviewerRow(email))!);
}

/** A join waits this long for its email to be verified. */
const PENDING_JOIN_HOURS = 24;

/**
 * Applies what someone typed on a join page, now that their email is verified. The invite is
 * checked again here, so a link regenerated in the meantime no longer lets them in.
 * Returns "invite" when there was a join but its link has since expired or been replaced.
 */
async function applyPendingJoin(email: string): Promise<"applied" | "none" | "invite"> {
  const db = await getDb();
  const since = new Date(Date.now() - PENDING_JOIN_HOURS * 3_600_000);
  const [join] = await db
    .select()
    .from(schema.pendingJoins)
    .where(and(eq(schema.pendingJoins.email, norm(email)), gt(schema.pendingJoins.updatedAt, since)));
  await db.delete(schema.pendingJoins).where(eq(schema.pendingJoins.email, norm(email)));
  if (!join) return "none";
  if (!(await inviteValid(join.role, join.token))) return "invite";

  if (join.role === "interviewer") {
    const row = await interviewerRow(email);
    if (row) {
      // Re-joining after being removed restores access (and takes the name they typed).
      await db.update(schema.interviewers).set({ removedAt: null, name: join.name }).where(eq(schema.interviewers.id, row.id));
    } else {
      await db
        .insert(schema.interviewers)
        .values({ name: join.name, email: norm(email), color: await nextColor() })
        .onConflictDoNothing();
    }
    return "applied";
  }

  if (await candidateByEmail(email)) return "applied";
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.candidates)
      .values({
        name: join.name,
        school: join.school,
        major: join.major,
        email: norm(email),
        status: "new",
        fit: 5,
        selfJoined: true,
        resumeJson: EMPTY_RESUME,
      })
      .returning();
    await tx.insert(schema.activity).values({
      kind: "new",
      title: `${join.name} joined themselves`,
      subtitle: [`#${String(row.seq).padStart(4, "0")}`, join.school].filter(Boolean).join(" · "),
      candidateId: row.id,
      actorId: null,
    });
  });
  return "applied";
}

export type SignInOutcome = { ok: true; to: string } | { ok: false; reason: NoAccess | "invite" };

/**
 * Every verified sign-in ends here (magic link, 6-digit code, or local dev): apply a pending
 * join, then route by role — interviewers to /crm, interns to /crm/me.
 */
export async function completeSignIn(email: string): Promise<SignInOutcome> {
  const join = await applyPendingJoin(email);
  const access = await accessFor(email);
  if (access.role === "interviewer") return { ok: true, to: "/crm" };
  if (access.role === "intern") return { ok: true, to: "/crm/me" };
  return { ok: false, reason: join === "invite" ? "invite" : access.reason };
}

/** Save what a join form collected until the email is verified. */
export async function savePendingJoin(join: {
  email: string;
  role: "interviewer" | "intern";
  token: string;
  name: string;
  school?: string;
  major?: string;
}) {
  const db = await getDb();
  const values = { ...join, email: norm(join.email), school: join.school ?? "", major: join.major ?? "" };
  await db
    .insert(schema.pendingJoins)
    .values(values)
    .onConflictDoUpdate({ target: schema.pendingJoins.email, set: { ...values, updatedAt: new Date() } });
}
