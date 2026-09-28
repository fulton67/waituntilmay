"use server";

import { and, desc, eq, inArray, isNotNull, notInArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema, type Db } from "../db";
import { requireInterviewer } from "./auth";
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
} from "./types";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const ACTIVITY_KEEP = 500;

async function logActivity(
  db: Db | Tx,
  entry: { kind: ActivityKind; title: string; subtitle: string; candidateId?: string | null; actorId: string },
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
    const me = await requireInterviewer();
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
    fitScore: z.number().int().min(0).max(100),
    summary: trimmed(400),
  })
  .partial();

export async function updateCandidate(candidateId: string, patch: z.input<typeof candidatePatch>) {
  return run(async () => {
    const me = await requireInterviewer();
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
    await requireInterviewer();
    id.parse(candidateId);
    const db = await getDb();
    await db.delete(schema.candidates).where(eq(schema.candidates.id, candidateId));
  });
}

// ─── Skills ("best at") ────────────────────────────────────────────────────

const skillInput = z.object({
  skill: trimmed(80).min(1, "Skill name is required"),
  score: z.number().int().min(0, "Score is 0–100").max(100, "Score is 0–100"),
});

export async function addSkill(candidateId: string, input: z.input<typeof skillInput>) {
  return run(async () => {
    await requireInterviewer();
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
    await requireInterviewer();
    id.parse(skillId);
    const v = skillInput.partial().parse(input);
    const db = await getDb();
    await db.update(schema.candidateSkills).set(v).where(eq(schema.candidateSkills.id, skillId));
  });
}

export async function removeSkill(skillId: string) {
  return run(async () => {
    await requireInterviewer();
    id.parse(skillId);
    const db = await getDb();
    await db.delete(schema.candidateSkills).where(eq(schema.candidateSkills.id, skillId));
  });
}

// ─── Areas & goals ─────────────────────────────────────────────────────────

export async function attachArea(candidateId: string, areaId: string) {
  return run(async () => {
    const me = await requireInterviewer();
    id.parse(candidateId);
    id.parse(areaId);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [area] = await tx.select().from(schema.areas).where(eq(schema.areas.id, areaId));
      if (!area) throw new UserError("That area no longer exists.");
      const name = await candidateName(tx, candidateId);
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
    await requireInterviewer();
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
  name: trimmed(80).min(1, "Name is required"),
  description: trimmed(200),
});

export async function createArea(input: z.input<typeof areaInput>) {
  return run(async () => {
    await requireInterviewer();
    const v = areaInput.parse(input);
    const db = await getDb();
    const [row] = await db.insert(schema.areas).values(v).returning();
    return { id: row.id };
  });
}

export async function updateArea(areaId: string, input: Partial<z.input<typeof areaInput>>) {
  return run(async () => {
    await requireInterviewer();
    id.parse(areaId);
    const v = areaInput.partial().parse(input);
    const db = await getDb();
    await db.update(schema.areas).set(v).where(eq(schema.areas.id, areaId));
  });
}

export async function deleteArea(areaId: string) {
  return run(async () => {
    await requireInterviewer();
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
    const me = await requireInterviewer();
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
  actualMinutes: z.number().int().min(1, "Minutes must be at least 1").max(600, "That's over 10 hours").nullable().optional(),
  debrief: trimmed(280).nullable().optional(),
});

export async function logInterview(interviewId: string, input: z.input<typeof logInput>) {
  return run(async () => {
    const me = await requireInterviewer();
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
        })
        .where(eq(schema.interviews.id, interviewId));

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
    const me = await requireInterviewer();
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
    const me = await requireInterviewer();
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
    await requireInterviewer();
    id.parse(candidateId);
    if (path !== null) z.string().regex(/^[0-9a-f-]{36}\/[\w.-]+\.pdf$/i, "Invalid file path").parse(path);
    const db = await getDb();
    await db.update(schema.candidates).set({ resumeFileUrl: path }).where(eq(schema.candidates.id, candidateId));
  });
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function updateMyName(name: string) {
  return run(async () => {
    const me = await requireInterviewer();
    const v = trimmed(60).min(1, "Name is required").parse(name);
    const db = await getDb();
    await db.update(schema.interviewers).set({ name: v }).where(eq(schema.interviewers.id, me.id));
  });
}

export async function addInterviewer(input: { name: string; email: string }) {
  return run(async () => {
    await requireInterviewer();
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
    const me = await requireInterviewer();
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
    const me = await requireInterviewer();
    if (!devToolsEnabled()) throw new UserError("Reset is only available in development.");
    const db = await getDb();
    await seedDatabase(db, { reset: true, ownerEmail: me.email });
  });
}
