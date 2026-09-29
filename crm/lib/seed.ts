import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import * as schema from "../db/schema";
import seed from "../seed.json";
import { CRM_TZ, addDays, daysBetween, todayIn } from "./time";
import type { ActivityKind, InterviewType, Status } from "./types";

const to10 = (n: number) => Math.max(1, Math.min(10, Math.round(n / 10)));

/** Stable uuid for a seed id so re-running the seed hits the same rows. */
export function seedUuid(id: string): string {
  const h = createHash("sha1").update(`fomo-crm-seed:${id}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const TYPE_MAP: Record<string, InterviewType> = {
  "Intro call": "intro",
  "Portfolio review": "portfolio",
  Technical: "technical",
  "Ops case": "ops_case",
  "Content review": "content_review",
  Final: "final",
};

/** Offset (ms) of `tz` from UTC at instant `at`. */
function tzOffset(at: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(at)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - at;
}

/** "2026-09-27T17:40:00" as wall-clock time in `tz`, shifted by `days`, → Date. */
function localToDate(local: string, days: number, tz: string): Date {
  const [d, t] = local.split("T");
  const shifted = addDays(d, days);
  const guess = Date.parse(`${shifted}T${t}Z`);
  return new Date(guess - tzOffset(guess, tz));
}

function slugEmail(name: string) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@seed.crm.local`;
}

export type SeedOptions = { today?: string; reset?: boolean; ownerEmail?: string };

/**
 * Loads crm/seed.json. Idempotent: rows get deterministic ids and inserts skip existing rows, so a
 * second run changes nothing. `reset: true` wipes candidate data and Next-up dismissals first (interviewers are kept).
 * Dates are shifted so the seed's baseDate lands on today.
 */
export async function seedDatabase(db: Db, opts: SeedOptions = {}) {
  const tz = CRM_TZ;
  const today = opts.today ?? todayIn(tz);
  const shift = daysBetween(seed.baseDate, today);
  const ownerEmail =
    opts.ownerEmail ?? (process.env.CRM_ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)[0];

  await db.transaction(async (tx) => {
    if (opts.reset) {
      await tx.execute(
        sql`TRUNCATE dismissals, sessions, reports, tasks, campaigns, activity, notes, interviews, candidate_areas, candidate_skills, candidates, areas RESTART IDENTITY CASCADE`,
      );
    }

    // Interviewers: the first seed interviewer (Naim) takes the owner's allowlisted email so their
    // sign-in lands on the seeded row. Existing rows with the same email are reused.
    const interviewerIds = new Map<string, string>();
    for (const [i, iv] of seed.interviewers.entries()) {
      const email = i === 0 && ownerEmail ? ownerEmail : slugEmail(iv.name);
      const [existing] = await tx.select().from(schema.interviewers).where(eq(schema.interviewers.email, email));
      if (existing) {
        interviewerIds.set(iv.id, existing.id);
        continue;
      }
      const id = seedUuid(iv.id);
      await tx.insert(schema.interviewers).values({ id, name: iv.name, email, color: iv.color }).onConflictDoNothing();
      interviewerIds.set(iv.id, id);
    }
    const byName = new Map(seed.interviewers.map((iv) => [iv.name, interviewerIds.get(iv.id)!]));

    await tx
      .insert(schema.areas)
      .values(
        seed.areas.map((a) => ({
          id: seedUuid(a.id),
          kind: a.kind as "area" | "goal",
          level: "level" in a ? (a.level as "core" | "small") : null,
          name: a.name,
          description: a.desc,
        })),
      )
      .onConflictDoNothing();

    await tx.insert(schema.settings).values({ id: 1 }).onConflictDoNothing();

    // Fit replay: each scored interview records the fit just before it, then fit becomes the
    // running average of scores — the same rule the logInterview action applies.
    const fitBefore = new Map<string, number>();
    const finalFit = new Map<string, number>();
    for (const c of seed.candidates) {
      let fit = c.fit / 10;
      const scored = seed.interviews
        .filter((v) => v.candidateId === c.id && v.score != null)
        .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
      const seen: number[] = [];
      for (const v of scored) {
        fitBefore.set(v.id, fit);
        seen.push(v.score!);
        fit = Math.round((seen.reduce((x, y) => x + y, 0) / seen.length) * 10) / 10;
      }
      finalFit.set(c.id, fit);
    }

    for (const [i, c] of seed.candidates.entries()) {
      const id = seedUuid(c.id);
      const createdAt = localToDate(`${seed.baseDate}T10:00:00`, shift - (seed.candidates.length - i) * 2, tz);
      await tx
        .insert(schema.candidates)
        .values({
          id,
          name: c.name,
          school: c.school,
          major: c.major,
          program: c.program,
          email: c.email,
          instagramHandle: c.instagram,
          portfolioUrl: c.portfolio,
          status: c.status as Status,
          fit: finalFit.get(c.id)!,
          resumeJson: c.resume,
          createdBy: interviewerIds.get(seed.interviewers[0].id),
          createdAt,
          updatedAt: createdAt,
        })
        .onConflictDoNothing();
      await tx
        .insert(schema.candidateSkills)
        .values(c.bestAt.map((s, j) => ({ id: seedUuid(`${c.id}:skill:${j}`), candidateId: id, skill: s.skill, score: to10(s.score) })))
        .onConflictDoNothing();
      const links = [...c.areas, ...c.goals];
      if (links.length) {
        await tx
          .insert(schema.candidateAreas)
          .values(links.map((a) => ({ id: seedUuid(`${c.id}:area:${a}`), candidateId: id, areaId: seedUuid(a) })))
          .onConflictDoNothing();
      }
    }

    await tx
      .insert(schema.interviews)
      .values(
        seed.interviews.map((v) => ({
          id: seedUuid(v.id),
          candidateId: seedUuid(v.candidateId),
          interviewerId: interviewerIds.get(v.interviewerId)!,
          date: addDays(v.date, shift),
          startTime: v.start,
          endTime: v.end,
          type: TYPE_MAP[v.type] ?? "intro",
          actualMinutes: v.took,
          score: v.score ?? null,
          fitBefore: fitBefore.get(v.id) ?? null,
          debrief: v.note || null,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(schema.notes)
      .values(
        seed.notes.map((n) => {
          const at = localToDate(n.at, shift, tz);
          return {
            id: seedUuid(n.id),
            candidateId: seedUuid(n.candidateId),
            authorId: byName.get(n.author) ?? interviewerIds.get(seed.interviewers[0].id)!,
            body: n.text,
            createdAt: at,
            updatedAt: at,
          };
        }),
      )
      .onConflictDoNothing();

    await tx
      .insert(schema.activity)
      .values(
        seed.events.map((e) => {
          const at = localToDate(e.at, shift, tz);
          const cand = seed.candidates.find((c) => e.sub.startsWith(c.name));
          return {
            id: seedUuid(e.id),
            kind: e.kind as ActivityKind,
            title: e.title,
            subtitle: e.sub,
            candidateId: cand ? seedUuid(cand.id) : null,
            actorId: null,
            createdAt: at,
            updatedAt: at,
          };
        }),
      )
      .onConflictDoNothing();

    const k = seed.campaign;
    const campaignId = seedUuid(k.id);
    await tx
      .insert(schema.campaigns)
      .values({
        id: campaignId,
        name: k.name,
        goal: k.goal,
        brief: k.brief,
        targets: k.targets,
        startDate: addDays(k.start, shift),
        endDate: addDays(k.end, shift),
        isCurrent: true,
      })
      .onConflictDoNothing();

    await tx
      .insert(schema.tasks)
      .values(
        seed.tasks.map((t) => ({
          id: seedUuid(t.id),
          campaignId,
          title: t.title,
          detail: t.detail,
          kind: t.kind as "work" | "interview",
          areaId: t.areaId ? seedUuid(t.areaId) : null,
          candidateId: t.candidateId ? seedUuid(t.candidateId) : null,
          day: addDays(t.day, shift),
          status: t.status as "todo" | "doing" | "done",
          createdBy: interviewerIds.get(seed.interviewers[0].id),
          completedAt: t.status === "done" ? localToDate(`${t.day}T12:30:00`, shift, tz) : null,
        })),
      )
      .onConflictDoNothing();

    const now = Date.now();
    await tx
      .insert(schema.sessions)
      .values(
        seed.sessions.map((x) => {
          // An open session must not start in the future when seeding early in the day.
          const start = new Date(Math.min(localToDate(`${x.day}T${x.start}:00`, shift, tz).getTime(), now - 47 * 60_000));
          return {
            id: seedUuid(x.id),
            taskId: seedUuid(x.taskId),
            candidateId: seedUuid(x.candidateId),
            startedAt: start,
            endedAt: x.end ? localToDate(`${x.day}T${x.end}:00`, shift, tz) : null,
            note: x.note,
          };
        }),
      )
      .onConflictDoNothing();

    await tx
      .insert(schema.reports)
      .values(
        seed.reports.map((r) => ({
          id: seedUuid(r.id),
          candidateId: seedUuid(r.candidateId),
          day: addDays(r.day, shift),
          summary: r.summary,
          submittedAt: localToDate(`${r.day}T18:10:00`, shift, tz),
        })),
      )
      .onConflictDoNothing();
  });

  return { today, shift };
}
