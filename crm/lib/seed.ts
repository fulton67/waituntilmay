import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import * as schema from "../db/schema";
import seed from "../seed.json";
import { CRM_TZ, addDays, daysBetween, todayIn } from "./time";
import type { ActivityKind, InterviewType, Status } from "./types";

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
 * second run changes nothing. `reset: true` wipes candidate data first (interviewers are kept).
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
        sql`TRUNCATE activity, notes, interviews, candidate_areas, candidate_skills, candidates, areas RESTART IDENTITY CASCADE`,
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
      .values(seed.areas.map((a) => ({ id: seedUuid(a.id), kind: a.kind as "area" | "goal", name: a.name, description: a.desc })))
      .onConflictDoNothing();

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
          fitScore: c.fit,
          resumeJson: c.resume,
          createdBy: interviewerIds.get(seed.interviewers[0].id),
          createdAt,
          updatedAt: createdAt,
        })
        .onConflictDoNothing();
      await tx
        .insert(schema.candidateSkills)
        .values(c.bestAt.map((s, j) => ({ id: seedUuid(`${c.id}:skill:${j}`), candidateId: id, skill: s.skill, score: s.score })))
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
  });

  return { today, shift };
}
