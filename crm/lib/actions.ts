"use server";

import { and, desc, eq, inArray, isNotNull, notInArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema, type Db } from "../db";
import { getViewer } from "./auth";
import { autoTier, firstName, fmtLogged, round1, sessionMinutes } from "./ranking";
import { AVATAR_COLORS } from "./colors";
import { devToolsEnabled } from "./env";
import { findClash, interviewPhase, statusAfterCompleted, statusAfterSchedule } from "./rules";
import { seedDatabase } from "./seed";
import { CRM_TZ, formatDay, fromMin, hhmm, nowMinutesIn, toMin, todayIn } from "./time";
import {
  INTERVIEW_TYPE_LABEL,
  INTERVIEW_TYPES,
  STATUS_LABEL,
  STATUSES,
  type ActionResult,
  type ActivityKind,
  type Status,
  type Tier,
  TIER_LABEL,
  TASK_STATUS_LABEL,
} from "./types";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const ACTIVITY_KEEP = 500;

async function logActivity(
  db: Db | Tx,
  entry: { kind: ActivityKind; title: string; subtitle: string; candidateId?: string | null; actorId: string | null },
) {
  await db.insert(schema.activity).values({ ...entry, candidateId: entry.candidateId ?? null });
  const keep = db.select({ id: schema.activity.id }).from(schema.activity).orderBy(desc(schema.activity.createdAt)).limit(ACTIVITY_KEEP);
  await db.delete(schema.activity).where(notInArray(schema.activity.id, keep));
}

/** Wraps an action: zod errors and thrown errors become `{ ok: false, error }`, and the router refreshes. */
async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input" };
    if (err instanceof UserError) return { ok: false, error: err.message };
    // redirect() from requireInterviewer must propagate.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[crm action]", err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

class UserError extends Error {}

/** Every interviewer-only write starts here. Interns get a clear refusal, not a redirect. */
async function interviewerOnly() {
  const viewer = await getViewer();
  if (!viewer) throw new UserError("Your session has ended. Sign in again.");
  if (viewer.role !== "interviewer") throw new UserError("Only interviewers can do that.");
  return viewer.interviewer;
}

/** The signed-in intern (candidate). Interviewers can't clock in or report on someone's behalf. */
async function internOnly() {
  const viewer = await getViewer();
  if (!viewer) throw new UserError("Your session has ended. Sign in again.");
  if (viewer.role !== "intern") throw new UserError("Only the intern can do that — use their own sign-in.");
  return viewer.candidate;
}

async function loadSettings(db: Db | Tx) {
  const [row] = await db.select().from(schema.settings);
  return { priorityAt: row?.priorityAt ?? 8, benchAt: row?.benchAt ?? 4 };
}

async function isBenched(db: Db | Tx, candidateId: string) {
  const [c] = await db
    .select({ fit: schema.candidates.fit, tierOverride: schema.candidates.tierOverride })
    .from(schema.candidates)
    .where(eq(schema.candidates.id, candidateId));
  if (!c) throw new UserError("That candidate no longer exists.");
  return (c.tierOverride ?? autoTier(c.fit, await loadSettings(db))) === "bench";
}

const id = z.string().uuid();
const trimmed = (max: number) => z.string().trim().max(max);

/** "@kerem.type", "instagram.com/kerem.type/" → "kerem.type". Handle only; never fetched. */
function igHandle(v: string) {
  return v
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

async function candidateName(db: Db | Tx, candidateId: string) {
  const [c] = await db.select({ name: schema.candidates.name }).from(schema.candidates).where(eq(schema.candidates.id, candidateId));
  if (!c) throw new UserError("That candidate no longer exists.");
  return c.name;
}

// ─── Candidates ────────────────────────────────────────────────────────────

const newCandidateInput = z.object({
  name: trimmed(120).min(1, "Name is required"),
  school: trimmed(160),
  major: trimmed(160),
  program: trimmed(80),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  instagram: trimmed(80),
  portfolio: trimmed(300),
  summary: trimmed(400),
});

export async function createCandidate(input: z.input<typeof newCandidateInput>) {
  return run(async () => {
    const me = await interviewerOnly();
    const v = newCandidateInput.parse(input);
    const db = await getDb();
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.candidates)
        .values({
          name: v.name,
          school: v.school,
          major: v.major,
          program: v.program,
          email: v.email,
          instagramHandle: igHandle(v.instagram),
          portfolioUrl: v.portfolio,
          resumeJson: { summary: v.summary, education: [], experience: [], skills: [] },
          createdBy: me.id,
        })
        .returning();
      await logActivity(tx, {
        kind: "new",
        title: `New candidate #${String(row.seq).padStart(4, "0")}`,
        subtitle: [v.name, v.school].filter(Boolean).join(" · "),
        candidateId: row.id,
        actorId: me.id,
      });
      return { id: row.id };
    });
  });
}

const candidatePatch = z
  .object({
    name: trimmed(120).min(1, "Name is required"),
    school: trimmed(160),
    major: trimmed(160),
    program: trimmed(80),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
    instagramHandle: trimmed(80),
    portfolioUrl: trimmed(300),
    phone: trimmed(40).nullable(),
    status: z.enum(STATUSES),
    fit: z.number().min(1, "Fit is 1–10").max(10, "Fit is 1–10").transform(round1),
    tierOverride: z.enum(["priority", "standard", "bench"]).nullable(),
    summary: trimmed(400),
  })
  .partial();

export async function updateCandidate(candidateId: string, patch: z.input<typeof candidatePatch>) {
  return run(async () => {
    const me = await interviewerOnly();
    id.parse(candidateId);
    const v = candidatePatch.parse(patch);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(schema.candidates).where(eq(schema.candidates.id, candidateId));
      if (!before) throw new UserError("That candidate no longer exists.");
      const { summary, ...fields } = v;
      if (fields.instagramHandle !== undefined) fields.instagramHandle = igHandle(fields.instagramHandle);
      await tx
        .update(schema.candidates)
        .set({ ...fields, ...(summary !== undefined ? { resumeJson: { ...before.resumeJson, summary } } : {}) })
        .where(eq(schema.candidates.id, candidateId));
      if (v.tierOverride !== undefined && v.tierOverride !== before.tierOverride) {
        await logActivity(tx, {
          kind: "status",
          title: v.tierOverride ? `Tier set to ${TIER_LABEL[v.tierOverride as Tier].toLowerCase()}` : "Tier back to automatic",
          subtitle: `${before.name} · by ${me.name}`,
          candidateId,
          actorId: me.id,
        });
      }
      if (v.status && v.status !== before.status) {
        await logActivity(tx, {
          kind: v.status === "awaiting" ? "awaiting" : "status",
          title: v.status === "awaiting" ? "Awaiting decision" : `Moved to ${STATUS_LABEL[v.status].toLowerCase()}`,
          subtitle: `${before.name} · ${STATUS_LABEL[before.status as Status]} → ${STATUS_LABEL[v.status]}`,
          candidateId,
          actorId: me.id,
        });
      }
    });
  });
}

export async function deleteCandidate(candidateId: string) {
  return run(async () => {
    await interviewerOnly();
    id.parse(candidateId);
    const db = await getDb();
    await db.delete(schema.candidates).where(eq(schema.candidates.id, candidateId));
  });
}

// ─── Skills ("best at") ────────────────────────────────────────────────────

const skillInput = z.object({
  skill: trimmed(80).min(1, "Skill name is required"),
  score: z.number().int().min(1, "Score is 1–10").max(10, "Score is 1–10"),
});

export async function addSkill(candidateId: string, input: z.input<typeof skillInput>) {
  return run(async () => {
    await interviewerOnly();
    id.parse(candidateId);
    const v = skillInput.parse(input);
    const db = await getDb();
    await candidateName(db, candidateId);
    const [row] = await db.insert(schema.candidateSkills).values({ candidateId, ...v }).returning();
    return { id: row.id };
  });
}

export async function updateSkill(skillId: string, input: Partial<z.input<typeof skillInput>>) {
  return run(async () => {
    await interviewerOnly();
    id.parse(skillId);
    const v = skillInput.partial().parse(input);
    const db = await getDb();
    await db.update(schema.candidateSkills).set(v).where(eq(schema.candidateSkills.id, skillId));
  });
}

export async function removeSkill(skillId: string) {
  return run(async () => {
    await interviewerOnly();
    id.parse(skillId);
    const db = await getDb();
    await db.delete(schema.candidateSkills).where(eq(schema.candidateSkills.id, skillId));
  });
}

// ─── Areas & goals ─────────────────────────────────────────────────────────

export async function attachArea(candidateId: string, areaId: string) {
  return run(async () => {
    const me = await interviewerOnly();
    id.parse(candidateId);
    id.parse(areaId);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [area] = await tx.select().from(schema.areas).where(eq(schema.areas.id, areaId));
      if (!area) throw new UserError("That area no longer exists.");
      const name = await candidateName(tx, candidateId);
      if (area.kind === "area" && area.level !== "small" && (await isBenched(tx, candidateId))) {
        throw new UserError(`${name} is benched — benched candidates can only be attached to small jobs.`);
      }
      const inserted = await tx.insert(schema.candidateAreas).values({ candidateId, areaId }).onConflictDoNothing().returning();
      if (inserted.length) {
        await logActivity(tx, {
          kind: "area",
          title: `Attached to ${area.kind === "goal" ? "goal" : "area"}`,
          subtitle: `${name} · ${area.name}`,
          candidateId,
          actorId: me.id,
        });
      }
    });
  });
}

export async function detachArea(candidateId: string, areaId: string) {
  return run(async () => {
    await interviewerOnly();
    id.parse(candidateId);
    id.parse(areaId);
    const db = await getDb();
    await db
      .delete(schema.candidateAreas)
      .where(and(eq(schema.candidateAreas.candidateId, candidateId), eq(schema.candidateAreas.areaId, areaId)));
  });
}

const areaInput = z.object({
  kind: z.enum(["area", "goal"]),
  level: z.enum(["core", "small"]).nullable().optional(),
  name: trimmed(80).min(1, "Name is required"),
  description: trimmed(200),
});

export async function createArea(input: z.input<typeof areaInput>) {
  return run(async () => {
    await interviewerOnly();
    const v = areaInput.parse(input);
    const db = await getDb();
    const [row] = await db
      .insert(schema.areas)
      .values({ ...v, level: v.kind === "goal" ? null : (v.level ?? "core") })
      .returning();
    return { id: row.id };
  });
}

export async function updateArea(areaId: string, input: Partial<z.input<typeof areaInput>>) {
  return run(async () => {
    await interviewerOnly();
    id.parse(areaId);
    const v = areaInput.partial().parse(input);
    const db = await getDb();
    await db.update(schema.areas).set(v).where(eq(schema.areas.id, areaId));
  });
}

export async function deleteArea(areaId: string) {
  return run(async () => {
    await interviewerOnly();
    id.parse(areaId);
    const db = await getDb();
    await db.delete(schema.areas).where(eq(schema.areas.id, areaId));
  });
}

// ─── Interviews ────────────────────────────────────────────────────────────

const scheduleInput = z.object({
  candidateId: id,
  interviewerId: id,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  length: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  type: z.enum(INTERVIEW_TYPES),
  location: trimmed(300).optional(),
});

export async function scheduleInterview(input: z.input<typeof scheduleInput>) {
  return run(async () => {
    const me = await interviewerOnly();
    const v = scheduleInput.parse(input);
    const startMin = toMin(v.start);
    const endMin = startMin + v.length;
    if (endMin > 24 * 60) throw new UserError("Interviews must end by midnight.");
    const db = await getDb();

    return db.transaction(async (tx) => {
      // Serialise scheduling per interviewer so two people can't book the same slot at once.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${v.interviewerId}))`);

      const sameDay = await tx
        .select({
          id: schema.interviews.id,
          interviewerId: schema.interviews.interviewerId,
          date: schema.interviews.date,
          startTime: schema.interviews.startTime,
          endTime: schema.interviews.endTime,
          type: schema.interviews.type,
          candidate: schema.candidates.name,
          interviewer: schema.interviewers.name,
        })
        .from(schema.interviews)
        .innerJoin(schema.candidates, eq(schema.candidates.id, schema.interviews.candidateId))
        .innerJoin(schema.interviewers, eq(schema.interviewers.id, schema.interviews.interviewerId))
        .where(and(eq(schema.interviews.interviewerId, v.interviewerId), eq(schema.interviews.date, v.date)));

      const clash = findClash(
        { interviewerId: v.interviewerId, date: v.date, startTime: v.start, endTime: fromMin(endMin) },
        sameDay.map((r) => ({ ...r, startTime: hhmm(r.startTime), endTime: hhmm(r.endTime) })),
      );
      if (clash) {
        throw new UserError(
          `${clash.interviewer} already has ${clash.candidate} (${INTERVIEW_TYPE_LABEL[clash.type]}) ` +
            `${hhmm(clash.startTime)}–${hhmm(clash.endTime)} on ${formatDay(v.date)}.`,
        );
      }

      const [cand] = await tx.select().from(schema.candidates).where(eq(schema.candidates.id, v.candidateId));
      if (!cand) throw new UserError("That candidate no longer exists.");
      if (await isBenched(tx, cand.id)) throw new UserError(`${cand.name} is benched — change their tier in Rankings first.`);

      const [row] = await tx
        .insert(schema.interviews)
        .values({
          candidateId: v.candidateId,
          interviewerId: v.interviewerId,
          date: v.date,
          startTime: v.start,
          endTime: fromMin(endMin),
          type: v.type,
          location: v.location || null,
        })
        .returning();

      const next = statusAfterSchedule(cand.status);
      if (next !== cand.status) await tx.update(schema.candidates).set({ status: next }).where(eq(schema.candidates.id, cand.id));

      await logActivity(tx, {
        kind: "time",
        title: "Interview scheduled",
        subtitle: `${cand.name} · ${INTERVIEW_TYPE_LABEL[v.type]} · ${formatDay(v.date)} ${v.start}`,
        candidateId: cand.id,
        actorId: me.id,
      });
      return { id: row.id };
    });
  });
}

const logInput = z.object({
  score: z.number().int().min(1, "Score is 1–10").max(10, "Score is 1–10").nullable().optional(),
  actualMinutes: z.number().int().min(1, "Minutes must be at least 1").max(600, "That's over 10 hours").nullable().optional(),
  debrief: trimmed(280).nullable().optional(),
});

export async function logInterview(interviewId: string, input: z.input<typeof logInput>) {
  return run(async () => {
    const me = await interviewerOnly();
    id.parse(interviewId);
    const v = logInput.parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [iv] = await tx.select().from(schema.interviews).where(eq(schema.interviews.id, interviewId));
      if (!iv) throw new UserError("That interview no longer exists.");
      const phase = interviewPhase(
        { date: iv.date, startTime: hhmm(iv.startTime), endTime: hhmm(iv.endTime) },
        todayIn(CRM_TZ),
        nowMinutesIn(CRM_TZ),
      );
      if (phase === "upcoming") throw new UserError("You can log an interview once it has started.");

      const [cand] = await tx.select().from(schema.candidates).where(eq(schema.candidates.id, iv.candidateId));
      await tx
        .update(schema.interviews)
        .set({
          ...(v.actualMinutes !== undefined ? { actualMinutes: v.actualMinutes } : {}),
          ...(v.debrief !== undefined ? { debrief: v.debrief || null } : {}),
          ...(v.score !== undefined
            ? {
                score: v.score,
                // Remember the fit just before this interview was first scored (drives the ↑/↓ delta).
                fitBefore: v.score == null ? null : (iv.fitBefore ?? cand.fit),
              }
            : {}),
        })
        .where(eq(schema.interviews.id, interviewId));

      if (v.score !== undefined && v.score !== iv.score) {
        // Scoring moves fit to the average of the scored interviews and clears any tier override.
        const scored = await tx
          .select({ score: schema.interviews.score })
          .from(schema.interviews)
          .where(and(eq(schema.interviews.candidateId, iv.candidateId), isNotNull(schema.interviews.score)));
        if (scored.length) {
          const avg = round1(scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length);
          await tx.update(schema.candidates).set({ fit: avg, tierOverride: null }).where(eq(schema.candidates.id, cand.id));
        }
        if (v.score != null) {
          await logActivity(tx, {
            kind: "time",
            title: "Interview scored",
            subtitle: `${cand.name} · ${INTERVIEW_TYPE_LABEL[iv.type]} ${v.score}/10 by ${me.name}`,
            candidateId: cand.id,
            actorId: me.id,
          });
        }
      }

      if (v.actualMinutes != null && v.actualMinutes !== iv.actualMinutes) {
        const completedBefore = await tx
          .select({ id: schema.interviews.id })
          .from(schema.interviews)
          .where(
            and(
              eq(schema.interviews.candidateId, iv.candidateId),
              isNotNull(schema.interviews.actualMinutes),
              sql`${schema.interviews.id} <> ${interviewId}`,
            ),
          );
        if (!completedBefore.length && iv.actualMinutes == null) {
          const next = statusAfterCompleted(cand.status);
          if (next !== cand.status) await tx.update(schema.candidates).set({ status: next }).where(eq(schema.candidates.id, cand.id));
        }
        await logActivity(tx, {
          kind: "time",
          title: "Interview logged",
          subtitle: `${cand.name} · ${INTERVIEW_TYPE_LABEL[iv.type]} took ${v.actualMinutes} min`,
          candidateId: cand.id,
          actorId: me.id,
        });
      }
    });
  });
}

export async function cancelInterview(interviewId: string) {
  return run(async () => {
    const me = await interviewerOnly();
    id.parse(interviewId);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [iv] = await tx.select().from(schema.interviews).where(eq(schema.interviews.id, interviewId));
      if (!iv) return;
      const name = await candidateName(tx, iv.candidateId);
      await tx.delete(schema.interviews).where(eq(schema.interviews.id, interviewId));
      await logActivity(tx, {
        kind: "time",
        title: "Interview cancelled",
        subtitle: `${name} · ${INTERVIEW_TYPE_LABEL[iv.type]} · ${formatDay(iv.date)} ${hhmm(iv.startTime)}`,
        candidateId: iv.candidateId,
        actorId: me.id,
      });
    });
  });
}

// ─── Notes ─────────────────────────────────────────────────────────────────

export async function addNote(candidateId: string, body: string) {
  return run(async () => {
    const me = await interviewerOnly();
    id.parse(candidateId);
    const text = trimmed(4000).min(1, "Write something first").parse(body);
    const db = await getDb();
    return db.transaction(async (tx) => {
      const name = await candidateName(tx, candidateId);
      const [row] = await tx.insert(schema.notes).values({ candidateId, authorId: me.id, body: text }).returning();
      await logActivity(tx, { kind: "note", title: "Note added", subtitle: `${name} · by ${me.name}`, candidateId, actorId: me.id });
      return { id: row.id };
    });
  });
}

// ─── Resume file ───────────────────────────────────────────────────────────

export async function setResumeFile(candidateId: string, path: string | null) {
  return run(async () => {
    await interviewerOnly();
    id.parse(candidateId);
    if (path !== null) z.string().regex(/^[0-9a-f-]{36}\/[\w.-]+\.pdf$/i, "Invalid file path").parse(path);
    const db = await getDb();
    await db.update(schema.candidates).set({ resumeFileUrl: path }).where(eq(schema.candidates.id, candidateId));
  });
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function updateMyName(name: string) {
  return run(async () => {
    const me = await interviewerOnly();
    const v = trimmed(60).min(1, "Name is required").parse(name);
    const db = await getDb();
    await db.update(schema.interviewers).set({ name: v }).where(eq(schema.interviewers.id, me.id));
  });
}

export async function addInterviewer(input: { name: string; email: string }) {
  return run(async () => {
    await interviewerOnly();
    const v = z
      .object({ name: trimmed(60).min(1, "Name is required"), email: z.string().trim().toLowerCase().email("Enter a valid email") })
      .parse(input);
    const db = await getDb();
    const all = await db.select({ id: schema.interviewers.id }).from(schema.interviewers);
    const inserted = await db
      .insert(schema.interviewers)
      .values({ ...v, color: AVATAR_COLORS[all.length % AVATAR_COLORS.length] })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) throw new UserError(`${v.email} is already an interviewer.`);
  });
}

export async function removeInterviewer(interviewerId: string) {
  return run(async () => {
    const me = await interviewerOnly();
    id.parse(interviewerId);
    if (interviewerId === me.id) throw new UserError("You can't remove yourself.");
    const db = await getDb();
    const [ivs, ns] = await Promise.all([
      db.select({ id: schema.interviews.id }).from(schema.interviews).where(eq(schema.interviews.interviewerId, interviewerId)),
      db.select({ id: schema.notes.id }).from(schema.notes).where(eq(schema.notes.authorId, interviewerId)),
    ]);
    if (ivs.length || ns.length) {
      throw new UserError(
        `They have ${ivs.length} interview${ivs.length === 1 ? "" : "s"} and ${ns.length} note${ns.length === 1 ? "" : "s"}; ` +
          "those keep their name, so they can't be removed.",
      );
    }
    await db.delete(schema.interviewers).where(inArray(schema.interviewers.id, [interviewerId]));
  });
}

export async function resetDemoData() {
  return run(async () => {
    const me = await interviewerOnly();
    if (!devToolsEnabled()) throw new UserError("Reset is only available in development.");
    const db = await getDb();
    await seedDatabase(db, { reset: true, ownerEmail: me.email });
  });
}

// ─── Rankings settings ─────────────────────────────────────────────────────

export async function updateSettings(input: { priorityAt: number; benchAt: number }) {
  return run(async () => {
    await interviewerOnly();
    const v = z
      .object({ priorityAt: z.number().int().min(2).max(10), benchAt: z.number().int().min(1).max(9) })
      .refine((x) => x.benchAt < x.priorityAt, "Bench must be below priority")
      .parse(input);
    const db = await getDb();
    await db.insert(schema.settings).values({ id: 1, ...v }).onConflictDoUpdate({ target: schema.settings.id, set: v });
  });
}

// ─── Campaign & tasks ──────────────────────────────────────────────────────

export async function updateCampaign(campaignId: string, input: { name?: string; goal?: string; brief?: string; targets?: string[] }) {
  return run(async () => {
    await interviewerOnly();
    id.parse(campaignId);
    const v = z
      .object({
        name: trimmed(120).min(1, "Name is required"),
        goal: trimmed(200),
        brief: trimmed(2000),
        targets: z.array(trimmed(80).min(1)).max(20),
      })
      .partial()
      .parse(input);
    const db = await getDb();
    await db.update(schema.campaigns).set(v).where(eq(schema.campaigns.id, campaignId));
  });
}

const taskInput = z.object({
  title: trimmed(160).min(1, "Title is required"),
  detail: trimmed(1000),
  kind: z.enum(["work", "interview"]),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day"),
  areaId: id.nullable(),
  candidateId: id.nullable(),
});

async function checkAssignable(tx: Tx, candidateId: string | null, areaId: string | null) {
  if (!candidateId || !areaId) return;
  if (!(await isBenched(tx, candidateId))) return;
  const [area] = await tx.select().from(schema.areas).where(eq(schema.areas.id, areaId));
  if (area?.kind === "area" && area.level !== "small") {
    throw new UserError(`${await candidateName(tx, candidateId)} is benched — benched candidates only take small jobs.`);
  }
}

export async function createTask(input: z.input<typeof taskInput>) {
  return run(async () => {
    const me = await interviewerOnly();
    const v = taskInput.parse(input);
    const db = await getDb();
    return db.transaction(async (tx) => {
      const [campaign] = await tx.select().from(schema.campaigns).where(eq(schema.campaigns.isCurrent, true)).limit(1);
      if (!campaign) throw new UserError("There's no current campaign to add tasks to.");
      await checkAssignable(tx, v.candidateId, v.areaId);
      const [row] = await tx.insert(schema.tasks).values({ ...v, campaignId: campaign.id, createdBy: me.id }).returning();
      await logActivity(tx, {
        kind: "task",
        title: v.candidateId ? "Task assigned" : "Task added",
        subtitle: `${v.title} · ${v.candidateId ? await candidateName(tx, v.candidateId) : "unassigned"}`,
        candidateId: v.candidateId,
        actorId: me.id,
      });
      return { id: row.id };
    });
  });
}

export async function updateTask(taskId: string, input: Partial<z.input<typeof taskInput>>) {
  return run(async () => {
    const me = await interviewerOnly();
    id.parse(taskId);
    const v = taskInput.partial().parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
      if (!before) throw new UserError("That task no longer exists.");
      const candidateId = v.candidateId !== undefined ? v.candidateId : before.candidateId;
      await checkAssignable(tx, candidateId, v.areaId !== undefined ? v.areaId : before.areaId);
      await tx.update(schema.tasks).set(v).where(eq(schema.tasks.id, taskId));
      if (v.candidateId !== undefined && v.candidateId !== before.candidateId) {
        // Reassigning ends the previous intern's running session on it.
        await tx
          .update(schema.sessions)
          .set({ endedAt: new Date(), note: "Task reassigned" })
          .where(and(eq(schema.sessions.taskId, taskId), sql`${schema.sessions.endedAt} is null`));
        await logActivity(tx, {
          kind: "task",
          title: v.candidateId ? "Task assigned" : "Task unassigned",
          subtitle: `${before.title}${v.candidateId ? ` · ${await candidateName(tx, v.candidateId)}` : ""} · by ${me.name}`,
          candidateId: v.candidateId ?? before.candidateId,
          actorId: me.id,
        });
      }
    });
  });
}

export async function deleteTask(taskId: string) {
  return run(async () => {
    await interviewerOnly();
    id.parse(taskId);
    const db = await getDb();
    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  });
}

/** Interviewers can set any task's status; an intern only their own. */
export async function setTaskStatus(taskId: string, status: "todo" | "doing" | "done") {
  return run(async () => {
    id.parse(taskId);
    z.enum(["todo", "doing", "done"]).parse(status);
    const viewer = await getViewer();
    if (!viewer) throw new UserError("Your session has ended. Sign in again.");
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [task] = await tx.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
      if (!task) throw new UserError("That task no longer exists.");
      if (viewer.role === "intern" && task.candidateId !== viewer.candidate.id) throw new UserError("That isn't your task.");
      if (task.status === status) return;
      await tx.update(schema.tasks).set({ status, completedAt: status === "done" ? new Date() : null }).where(eq(schema.tasks.id, taskId));
      const who = viewer.role === "intern" ? viewer.candidate.name : viewer.interviewer.name;
      await logActivity(tx, {
        kind: "task",
        title: `Task ${TASK_STATUS_LABEL[status].toLowerCase()}`,
        subtitle: `${task.title} · by ${who}`,
        candidateId: task.candidateId,
        actorId: viewer.role === "interviewer" ? viewer.interviewer.id : null,
      });
    });
  });
}

// ─── Clock in / out, reports (interns only) ────────────────────────────────

async function closeOpenSession(tx: Tx, candidateId: string, note: string) {
  const openRows = await tx
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.candidateId, candidateId), sql`${schema.sessions.endedAt} is null`));
  for (const s of openRows) {
    await tx.update(schema.sessions).set({ endedAt: new Date(), note: s.note ?? note }).where(eq(schema.sessions.id, s.id));
  }
  return openRows;
}

/**
 * Who a clock action is for: the signed-in intern, or — for an interviewer working from the
 * candidate drawer — the intern the task belongs to. Returns the intern and a "by …" suffix.
 */
async function clockActor(candidateIdForInterviewer: string | null) {
  const viewer = await getViewer();
  if (!viewer) throw new UserError("Your session has ended. Sign in again.");
  if (viewer.role === "intern") return { intern: viewer.candidate, by: "" };
  if (!candidateIdForInterviewer) throw new UserError("That task isn't assigned to anyone.");
  const db = await getDb();
  const [c] = await db
    .select({ id: schema.candidates.id, name: schema.candidates.name, email: schema.candidates.email })
    .from(schema.candidates)
    .where(eq(schema.candidates.id, candidateIdForInterviewer));
  if (!c) throw new UserError("That candidate no longer exists.");
  return { intern: c, by: ` · by ${viewer.interviewer.name}` };
}

export async function clockIn(taskId: string) {
  return run(async () => {
    id.parse(taskId);
    const db = await getDb();
    const [owner] = await db.select({ candidateId: schema.tasks.candidateId }).from(schema.tasks).where(eq(schema.tasks.id, taskId));
    const { intern: me, by } = await clockActor(owner?.candidateId ?? null);
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${me.id}))`);
      const [task] = await tx.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
      if (!task || task.candidateId !== me.id) throw new UserError("That isn't your task.");
      if (task.status === "done") throw new UserError("That task is already done.");
      // One task at a time, rigidly: switching closes whatever was running.
      const closed = await closeOpenSession(tx, me.id, `Switched to "${task.title}"`);
      const [row] = await tx.insert(schema.sessions).values({ taskId, candidateId: me.id }).returning();
      if (task.status === "todo") await tx.update(schema.tasks).set({ status: "doing" }).where(eq(schema.tasks.id, taskId));
      await logActivity(tx, {
        kind: "clock",
        title: "Clocked in",
        subtitle: `${me.name} · ${task.title}${closed.length ? " (switched tasks)" : ""}${by}`,
        candidateId: me.id,
        actorId: null,
      });
      return { id: row.id };
    });
  });
}

export async function clockOut(input: { note: string; done: boolean; candidateId?: string }) {
  return run(async () => {
    const v = z
      .object({ note: trimmed(1000).min(1, "Say what you got done"), done: z.boolean(), candidateId: id.optional() })
      .parse(input);
    const { intern: me, by } = await clockActor(v.candidateId ?? null);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(schema.sessions)
        .where(and(eq(schema.sessions.candidateId, me.id), sql`${schema.sessions.endedAt} is null`));
      if (!session) throw new UserError("You're not clocked in.");
      const ended = new Date();
      await tx.update(schema.sessions).set({ endedAt: ended, note: v.note }).where(eq(schema.sessions.id, session.id));
      const [task] = await tx.select().from(schema.tasks).where(eq(schema.tasks.id, session.taskId));
      if (v.done && task && task.status !== "done") {
        await tx.update(schema.tasks).set({ status: "done", completedAt: ended }).where(eq(schema.tasks.id, task.id));
      }
      const minutes = sessionMinutes({ startedAt: session.startedAt.toISOString(), endedAt: ended.toISOString() }, ended.getTime());
      await logActivity(tx, {
        kind: "clock",
        title: v.done ? "Clocked out · task done" : "Clocked out",
        subtitle: `${me.name} · ${task?.title ?? "task"} · ${fmtLogged(minutes)}${by}`,
        candidateId: me.id,
        actorId: null,
      });
    });
  });
}

export async function submitReport(summary: string) {
  return run(async () => {
    const me = await internOnly();
    const text = trimmed(4000).min(1, "Write a line or two first").parse(summary);
    const day = todayIn(CRM_TZ);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const closed = await closeOpenSession(tx, me.id, "Clocked out with the day's report");
      await tx
        .insert(schema.reports)
        .values({ candidateId: me.id, day, summary: text })
        .onConflictDoUpdate({ target: [schema.reports.candidateId, schema.reports.day], set: { summary: text, submittedAt: new Date() } });
      await logActivity(tx, {
        kind: "report",
        title: "Report submitted",
        subtitle: `${firstName(me.name)} · ${formatDay(day)}${closed.length ? " · clocked out" : ""}`,
        candidateId: me.id,
        actorId: null,
      });
    });
  });
}
