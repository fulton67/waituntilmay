import "server-only";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "../db";
import { devToolsEnabled, ownerEmails, supabaseConfig } from "./env";
import { loadInvites } from "./invites";
import { CRM_TZ, hhmm, todayIn } from "./time";
import type { Campaign, CrmData, InternData, Interviewer, Report, Session, Task } from "./types";

const iso = (d: Date) => d.toISOString();

/**
 * The whole CRM as one snapshot. The team is small (tens of candidates), so every view reads from
 * this and client-side filtering stays instant. Revisit if the pool grows past a few hundred.
 */
export async function loadCrmData(me: Interviewer): Promise<CrmData> {
  const db = await getDb();
  const [interviewers, candidates, skills, areas, links, interviews, notes, activity, settingsRows, campaign] = await Promise.all([
    db.select().from(schema.interviewers).orderBy(asc(schema.interviewers.createdAt), asc(schema.interviewers.name)),
    db.select().from(schema.candidates).orderBy(asc(schema.candidates.seq)),
    db.select().from(schema.candidateSkills).orderBy(desc(schema.candidateSkills.score), asc(schema.candidateSkills.createdAt)),
    db.select().from(schema.areas).orderBy(asc(schema.areas.kind), asc(schema.areas.createdAt), asc(schema.areas.name)),
    db.select().from(schema.candidateAreas),
    db.select().from(schema.interviews).orderBy(asc(schema.interviews.date), asc(schema.interviews.startTime)),
    db.select().from(schema.notes).orderBy(desc(schema.notes.createdAt)),
    db.select().from(schema.activity).orderBy(desc(schema.activity.createdAt)).limit(60),
    db.select().from(schema.settings),
    currentCampaign(),
  ]);
  const [tasks, sessions, reports, dismissed, invites] = await Promise.all([
    campaign ? db.select().from(schema.tasks).where(eq(schema.tasks.campaignId, campaign.id)).orderBy(asc(schema.tasks.day), asc(schema.tasks.createdAt)) : [],
    db.select().from(schema.sessions).orderBy(asc(schema.sessions.startedAt)),
    db.select().from(schema.reports).orderBy(desc(schema.reports.day)),
    db
      .select({ key: schema.dismissals.key })
      .from(schema.dismissals)
      .where(and(eq(schema.dismissals.interviewerId, me.id), eq(schema.dismissals.day, todayIn(CRM_TZ)))),
    loadInvites(),
  ]);

  return {
    me,
    interviewers: interviewers.map((i) => ({ id: i.id, name: i.name, email: i.email, color: i.color, ...(i.removedAt ? { removed: true } : {}) })),
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
      fit: c.fit,
      tierOverride: c.tierOverride,
      resumeJson: c.resumeJson,
      resumeFileUrl: c.resumeFileUrl,
      createdAt: iso(c.createdAt),
      selfJoined: c.selfJoined,
      skills: skills.filter((s) => s.candidateId === c.id).map((s) => ({ id: s.id, skill: s.skill, score: s.score })),
      areaIds: links.filter((l) => l.candidateId === c.id).map((l) => l.areaId),
    })),
    areas: areas.map((a) => ({ id: a.id, kind: a.kind, level: a.level, name: a.name, description: a.description })),
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
      score: v.score,
      fitBefore: v.fitBefore,
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
    settings: { priorityAt: settingsRows[0]?.priorityAt ?? 8, benchAt: settingsRows[0]?.benchAt ?? 4 },
    dismissed: dismissed.map((d) => d.key),
    owners: ownerEmails(),
    invites,
    campaign,
    tasks: tasks.map(mapTask),
    sessions: sessions.map(mapSession),
    reports: reports.map(mapReport),
    today: todayIn(CRM_TZ),
    tz: CRM_TZ,
    devTools: devToolsEnabled(),
    storage: supabaseConfig() ? "supabase" : "local",
    realtime: supabaseConfig(),
  };
}

type TaskRow = typeof schema.tasks.$inferSelect;
type SessionRow = typeof schema.sessions.$inferSelect;
type ReportRow = typeof schema.reports.$inferSelect;

const mapTask = (t: TaskRow): Task => ({
  id: t.id,
  campaignId: t.campaignId,
  title: t.title,
  detail: t.detail,
  kind: t.kind,
  areaId: t.areaId,
  candidateId: t.candidateId,
  day: t.day,
  status: t.status,
  completedAt: t.completedAt ? iso(t.completedAt) : null,
});
const mapSession = (s: SessionRow): Session => ({
  id: s.id,
  taskId: s.taskId,
  candidateId: s.candidateId,
  startedAt: iso(s.startedAt),
  endedAt: s.endedAt ? iso(s.endedAt) : null,
  note: s.note,
});
const mapReport = (r: ReportRow): Report => ({ id: r.id, candidateId: r.candidateId, day: r.day, summary: r.summary, submittedAt: iso(r.submittedAt) });

export async function currentCampaign(): Promise<Campaign | null> {
  const db = await getDb();
  const [k] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.isCurrent, true)).orderBy(desc(schema.campaigns.createdAt)).limit(1);
  return k ? { id: k.id, name: k.name, goal: k.goal, brief: k.brief, targets: k.targets, startDate: k.startDate, endDate: k.endDate } : null;
}

/**
 * An intern's page, built only from rows that belong to `candidateId`. Nothing about other
 * candidates, notes, scores, fits, rankings or tiers is ever selected here.
 */
export async function loadInternData(candidateId: string, viewer: InternData["viewer"]): Promise<InternData | null> {
  const db = await getDb();
  const [c] = await db
    .select({ id: schema.candidates.id, name: schema.candidates.name, email: schema.candidates.email })
    .from(schema.candidates)
    .where(eq(schema.candidates.id, candidateId));
  if (!c) return null;
  const campaign = await currentCampaign();
  const [tasks, sessions, reports, interviews, links] = await Promise.all([
    campaign
      ? db
          .select()
          .from(schema.tasks)
          .where(and(eq(schema.tasks.campaignId, campaign.id), eq(schema.tasks.candidateId, c.id)))
          .orderBy(asc(schema.tasks.day), asc(schema.tasks.createdAt))
      : [],
    db.select().from(schema.sessions).where(eq(schema.sessions.candidateId, c.id)).orderBy(asc(schema.sessions.startedAt)),
    db.select().from(schema.reports).where(eq(schema.reports.candidateId, c.id)).orderBy(desc(schema.reports.day)),
    db
      .select({
        id: schema.interviews.id,
        date: schema.interviews.date,
        startTime: schema.interviews.startTime,
        endTime: schema.interviews.endTime,
        type: schema.interviews.type,
        location: schema.interviews.location,
        interviewerName: schema.interviewers.name,
        interviewerColor: schema.interviewers.color,
      })
      .from(schema.interviews)
      .innerJoin(schema.interviewers, eq(schema.interviewers.id, schema.interviews.interviewerId))
      .where(eq(schema.interviews.candidateId, c.id))
      .orderBy(asc(schema.interviews.date), asc(schema.interviews.startTime)),
    db.select({ areaId: schema.candidateAreas.areaId }).from(schema.candidateAreas).where(eq(schema.candidateAreas.candidateId, c.id)),
  ]);
  const areas = links.length
    ? await db
        .select({ id: schema.areas.id, kind: schema.areas.kind, name: schema.areas.name, description: schema.areas.description })
        .from(schema.areas)
        .where(inArray(schema.areas.id, links.map((l) => l.areaId)))
    : [];
  return {
    viewer,
    intern: c,
    campaign,
    tasks: tasks.map(mapTask),
    sessions: sessions.map(mapSession),
    reports: reports.map(mapReport),
    interviews: interviews.map((v) => ({
      id: v.id,
      date: v.date,
      startTime: hhmm(v.startTime),
      endTime: hhmm(v.endTime),
      type: v.type,
      location: v.location,
      interviewer: { name: v.interviewerName, color: v.interviewerColor },
    })),
    areas,
    today: todayIn(CRM_TZ),
    tz: CRM_TZ,
  };
}

/** Every session with intern and task names (time only — no rates or amounts). The route filters by day. */
export async function timesheetRows() {
  const db = await getDb();
  const rows = await db
    .select({
      intern: schema.candidates.name,
      task: schema.tasks.title,
      startedAt: schema.sessions.startedAt,
      endedAt: schema.sessions.endedAt,
      note: schema.sessions.note,
    })
    .from(schema.sessions)
    .innerJoin(schema.candidates, eq(schema.candidates.id, schema.sessions.candidateId))
    .innerJoin(schema.tasks, eq(schema.tasks.id, schema.sessions.taskId))
    .where(isNotNull(schema.sessions.startedAt))
    .orderBy(asc(schema.candidates.name), asc(schema.sessions.startedAt));
  return rows;
}
