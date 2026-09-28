import "server-only";
import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "../db";
import { devToolsEnabled, supabaseConfig } from "./env";
import { CRM_TZ, hhmm, todayIn } from "./time";
import type { CrmData, Interviewer } from "./types";

const iso = (d: Date) => d.toISOString();

/**
 * The whole CRM as one snapshot. The team is small (tens of candidates), so every view reads from
 * this and client-side filtering stays instant. Revisit if the pool grows past a few hundred.
 */
export async function loadCrmData(me: Interviewer): Promise<CrmData> {
  const db = await getDb();
  const [interviewers, candidates, skills, areas, links, interviews, notes, activity] = await Promise.all([
    db.select().from(schema.interviewers).orderBy(asc(schema.interviewers.createdAt), asc(schema.interviewers.name)),
    db.select().from(schema.candidates).orderBy(asc(schema.candidates.seq)),
    db.select().from(schema.candidateSkills).orderBy(desc(schema.candidateSkills.score), asc(schema.candidateSkills.createdAt)),
    db.select().from(schema.areas).orderBy(asc(schema.areas.kind), asc(schema.areas.createdAt), asc(schema.areas.name)),
    db.select().from(schema.candidateAreas),
    db.select().from(schema.interviews).orderBy(asc(schema.interviews.date), asc(schema.interviews.startTime)),
    db.select().from(schema.notes).orderBy(desc(schema.notes.createdAt)),
    db.select().from(schema.activity).orderBy(desc(schema.activity.createdAt)).limit(60),
  ]);

  return {
    me,
    interviewers: interviewers.map((i) => ({ id: i.id, name: i.name, email: i.email, color: i.color })),
    candidates: candidates.map((c) => ({
      id: c.id,
      seq: c.seq,
      name: c.name,
      school: c.school,
      major: c.major,
      program: c.program,
      email: c.email,
      instagramHandle: c.instagramHandle,
      portfolioUrl: c.portfolioUrl,
      phone: c.phone,
      status: c.status,
      fitScore: c.fitScore,
      resumeJson: c.resumeJson,
      resumeFileUrl: c.resumeFileUrl,
      createdAt: iso(c.createdAt),
      skills: skills.filter((s) => s.candidateId === c.id).map((s) => ({ id: s.id, skill: s.skill, score: s.score })),
      areaIds: links.filter((l) => l.candidateId === c.id).map((l) => l.areaId),
    })),
    areas: areas.map((a) => ({ id: a.id, kind: a.kind, name: a.name, description: a.description })),
    interviews: interviews.map((v) => ({
      id: v.id,
      candidateId: v.candidateId,
      interviewerId: v.interviewerId,
      date: v.date,
      startTime: hhmm(v.startTime),
      endTime: hhmm(v.endTime),
      type: v.type,
      location: v.location,
      actualMinutes: v.actualMinutes,
      debrief: v.debrief,
    })),
    notes: notes.map((n) => ({ id: n.id, candidateId: n.candidateId, authorId: n.authorId, body: n.body, createdAt: iso(n.createdAt) })),
    activity: activity.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      subtitle: a.subtitle,
      candidateId: a.candidateId,
      actorId: a.actorId,
      createdAt: iso(a.createdAt),
    })),
    today: todayIn(CRM_TZ),
    tz: CRM_TZ,
    devTools: devToolsEnabled(),
    storage: supabaseConfig() ? "supabase" : "local",
    realtime: supabaseConfig(),
  };
}
