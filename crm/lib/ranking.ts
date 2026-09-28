/**
 * Derived values shared by server and client: tiers, ranking, deltas, scale, assignee
 * suggestions, day stats, the day-log narrative, and the "Next up" proposals engine.
 *
 * `proposals()` is a blackboard: every action lands in shared state (tasks, sessions,
 * interviews, reports) and this one function reads that state and proposes the next move.
 * Add rules here — never scatter them across the UI.
 */
import { interviewPhase } from "./rules";
import { matchScore } from "./suggest";
import { addDays, daysBetween, formatDay, toMin } from "./time";
import {
  INTERVIEW_TYPE_LABEL,
  type Area,
  type Campaign,
  type Candidate,
  type Interview,
  type Interviewer,
  type Report,
  type Session,
  type Settings,
  type Task,
  type Tier,
} from "./types";

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

// ─── Tiers & ranking ───────────────────────────────────────────────────────

/** Absolute bands, not a curve: five strong candidates can all be Priority. */
export function autoTier(fit: number, s: Settings): Tier {
  if (fit >= s.priorityAt) return "priority";
  if (fit <= s.benchAt) return "bench";
  return "standard";
}

export function tierOf(c: Pick<Candidate, "fit" | "tierOverride">, s: Settings): Tier {
  return c.tierOverride ?? autoTier(c.fit, s);
}

/** All candidates by fit desc, ties by name. Rank is for display only. */
export function ranked<T extends Pick<Candidate, "fit" | "name">>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => b.fit - a.fit || a.name.localeCompare(b.name));
}

export function rankMap(candidates: Pick<Candidate, "id" | "fit" | "name">[]): Map<string, number> {
  return new Map(ranked(candidates).map((c, i) => [c.id, i + 1]));
}

// ─── Scores ────────────────────────────────────────────────────────────────

const chrono = (a: Interview, b: Interview) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`);

export function scoredInterviews(candidateId: string, interviews: Interview[]): Interview[] {
  return interviews.filter((iv) => iv.candidateId === candidateId && iv.score != null).sort(chrono);
}

export function interviewAverage(scored: Pick<Interview, "score">[]): number | null {
  if (!scored.length) return null;
  return round1(scored.reduce((s, iv) => s + (iv.score ?? 0), 0) / scored.length);
}

/** Fit now minus fit before the most recent scored interview; null before any score. */
export function fitDelta(c: Pick<Candidate, "id" | "fit">, interviews: Interview[]): number | null {
  const scored = scoredInterviews(c.id, interviews);
  const last = scored[scored.length - 1];
  if (!last || last.fitBefore == null) return null;
  return round1(c.fit - last.fitBefore);
}

/** The fit before the first score (the hollow dot); the current fit until something is scored. */
export function baselineFit(c: Pick<Candidate, "id" | "fit">, interviews: Interview[]): number {
  return scoredInterviews(c.id, interviews)[0]?.fitBefore ?? c.fit;
}

/**
 * Axis floor for bars and score strips: a pool clustered at 6–9 draws on a 5–10 axis so the
 * differences are readable. Never below 1, never above 6.
 */
export function scaleFloor(values: number[]): number {
  if (!values.length) return 1;
  return Math.max(1, Math.min(6, Math.floor(Math.min(...values)) - 1));
}

/** Percentage position of `v` on the floor→10 axis. */
export function onScale(v: number, floor: number): number {
  return Math.max(0, Math.min(100, ((v - floor) / (10 - floor)) * 100));
}

export function poolFloor(candidates: Candidate[], interviews: Interview[]): number {
  const values: number[] = [];
  for (const c of candidates) {
    values.push(c.fit, baselineFit(c, interviews));
  }
  for (const iv of interviews) if (iv.score != null) values.push(iv.score);
  return scaleFloor(values);
}

// ─── Assignee suggestion ───────────────────────────────────────────────────

export type AssigneeSuggestion =
  | { pick: Candidate; score: number; message: string }
  | { pick: null; message: string; benchedMatches: Candidate[] };

/**
 * The eligible candidate whose skills best match the area (ties by fit). Benched candidates are
 * eligible only for small jobs. Never picks someone with no matching skill.
 */
export function suggestAssignee(
  area: Area | null | undefined,
  candidates: Candidate[],
  settings: Settings,
): AssigneeSuggestion {
  if (!area) return { pick: null, message: "Pick an area first so the suggestion can match skills.", benchedMatches: [] };
  const scoredAll = candidates
    .map((c) => ({ c, score: matchScore(c, area), bench: tierOf(c, settings) === "bench" }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.c.fit - a.c.fit || a.c.name.localeCompare(b.c.name));
  const eligible = scoredAll.filter((x) => !x.bench || area.level === "small");
  if (eligible.length) {
    const best = eligible[0];
    return { pick: best.c, score: best.score, message: `${firstName(best.c.name)} matches ${area.name} best (skill match ${best.score}).` };
  }
  const benched = scoredAll.filter((x) => x.bench).map((x) => x.c);
  if (benched.length) {
    return {
      pick: null,
      benchedMatches: benched,
      message: `Only benched candidates match ${area.name}: ${benched.map((c) => firstName(c.name)).join(", ")}. Assign by hand if you want one of them.`,
    };
  }
  return { pick: null, benchedMatches: [], message: `Nobody's skills match ${area.name}. Assign by hand.` };
}

// ─── Sessions & day stats ──────────────────────────────────────────────────

export function sessionMinutes(s: Pick<Session, "startedAt" | "endedAt">, nowMs: number): number {
  const end = s.endedAt ? Date.parse(s.endedAt) : nowMs;
  return Math.max(0, Math.round((end - Date.parse(s.startedAt)) / 60_000));
}

/** "6h", "2h 45m", "45m", "0m" */
export function fmtLogged(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${String(m).padStart(2, "0")}m` : `${h}h`;
}

/** Local calendar day (in the CRM timezone) of an ISO instant. */
export function dayOf(iso: string, tz: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

/** Interns = candidates with at least one assigned task in the campaign. */
export function internsOf(candidates: Candidate[], tasks: Task[]): Candidate[] {
  const ids = new Set(tasks.map((t) => t.candidateId).filter(Boolean));
  return candidates.filter((c) => ids.has(c.id));
}

export type InternDay = {
  candidate: Pick<Candidate, "id" | "name">;
  sessions: Session[];
  minutes: number;
  open: Session | null;
  tasksWorked: string[];
  finished: Task[];
  report: Report | null;
};

export type DayStats = {
  day: string;
  interns: InternDay[];
  totals: { minutes: number; tasksWorked: number; finished: number; reports: number; interns: number; active: number };
};

export function dayStats(
  day: string,
  state: { candidates: Pick<Candidate, "id" | "name">[]; tasks: Task[]; sessions: Session[]; reports: Report[] },
  tz: string,
  nowMs: number,
): DayStats {
  const internIds = new Set(state.tasks.map((t) => t.candidateId).filter(Boolean) as string[]);
  for (const s of state.sessions) internIds.add(s.candidateId);
  const interns = state.candidates
    .filter((c) => internIds.has(c.id))
    .map((c) => {
      const sessions = state.sessions
        .filter((s) => s.candidateId === c.id && dayOf(s.startedAt, tz) === day)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
      return {
        candidate: c,
        sessions,
        minutes: sessions.reduce((m, s) => m + sessionMinutes(s, nowMs), 0),
        open: sessions.find((s) => !s.endedAt) ?? null,
        tasksWorked: [...new Set(sessions.map((s) => s.taskId))],
        finished: state.tasks.filter((t) => t.candidateId === c.id && t.completedAt && dayOf(t.completedAt, tz) === day),
        report: state.reports.find((r) => r.candidateId === c.id && r.day === day) ?? null,
      };
    });
  const worked = new Set(interns.flatMap((i) => i.tasksWorked));
  return {
    day,
    interns,
    totals: {
      minutes: interns.reduce((m, i) => m + i.minutes, 0),
      tasksWorked: worked.size,
      finished: interns.reduce((n, i) => n + i.finished.length, 0),
      reports: interns.filter((i) => i.report).length,
      interns: interns.length,
      active: interns.filter((i) => i.minutes > 0).length,
    },
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The day-log paragraph: plain and factual, generated from sessions, tasks and reports. */
export function narrative(stats: DayStats, campaign: Pick<Campaign, "name" | "startDate"> | null, taskTitle: (id: string) => string): string {
  const t = stats.totals;
  const lead = campaign ? `Day ${daysBetween(campaign.startDate, stats.day) + 1} of ${campaign.name}` : formatDay(stats.day);
  if (!t.minutes && !t.finished && !t.reports) return `${lead}: nothing logged yet.`;
  const parts = [
    `${lead}: ${plural(t.active, "intern")} logged ${fmtLogged(t.minutes)} across ${plural(t.tasksWorked, "task")}, ${t.finished} finished, ${plural(t.reports, "report")} in.`,
  ];
  for (const i of stats.interns) {
    const who = firstName(i.candidate.name);
    if (i.report) {
      parts.push(`${who}: ${i.report.summary.trim().replace(/\s+/g, " ")}`);
    } else if (i.minutes > 0) {
      const titles = i.tasksWorked.map(taskTitle);
      const on = titles.length === 1 ? titles[0] : `${titles.length} tasks`;
      parts.push(`${who} logged ${fmtLogged(i.minutes)} on ${on}${i.open ? " and is still clocked in" : ""} — no report yet.`);
    } else if (i.finished.length) {
      parts.push(`${who} finished ${i.finished.map((f) => f.title).join(", ")} — no report yet.`);
    }
  }
  return parts.join(" ");
}

// ─── Proposals ("Next up") ─────────────────────────────────────────────────

export type ProposalAction =
  | { type: "assign"; taskId: string; candidateId: string; label: string }
  | { type: "openAssign"; taskId?: string; candidateId?: string; label: string }
  | { type: "openCandidate"; candidateId: string; tab: "notes" | "interviews" | "resume" | "assignments"; label: string };

export type Proposal = { id: string; priority: 1 | 2 | 3; text: string; action: ProposalAction };

export type BoardState = {
  candidates: Candidate[];
  interviewers: Pick<Interviewer, "id" | "name">[];
  areas: Area[];
  tasks: Task[];
  sessions: Session[];
  interviews: Interview[];
  reports: Report[];
  settings: Settings;
};

const open = (t: Task) => t.status !== "done";

export function proposals(state: BoardState, clock: { today: string; nowMin: number; nowMs: number; tz: string }): Proposal[] {
  const { today, nowMin, nowMs, tz } = clock;
  const out: Proposal[] = [];
  const byId = new Map(state.candidates.map((c) => [c.id, c]));
  const areaById = new Map(state.areas.map((a) => [a.id, a]));
  const tier = (c: Candidate) => tierOf(c, state.settings);
  const interns = internsOf(state.candidates, state.tasks);
  const unassigned = state.tasks.filter((t) => !t.candidateId && open(t));

  // 1 · Unassigned task due today or overdue.
  for (const t of unassigned.filter((t) => t.day <= today).sort((a, b) => a.day.localeCompare(b.day))) {
    const s = suggestAssignee(t.areaId ? areaById.get(t.areaId) : null, state.candidates, state.settings);
    out.push({
      id: `unassigned:${t.id}`,
      priority: 1,
      text: `"${t.title}" is ${t.day < today ? `overdue (due ${formatDay(t.day)})` : "due today"} and unassigned.`,
      action: s.pick
        ? { type: "assign", taskId: t.id, candidateId: s.pick.id, label: `Assign ${firstName(s.pick.name)}` }
        : { type: "openAssign", taskId: t.id, label: "Assign…" },
    });
  }

  // 1 · Assigned task that is overdue.
  for (const t of state.tasks.filter((t) => t.candidateId && open(t) && t.day < today)) {
    const c = byId.get(t.candidateId!);
    if (!c) continue;
    out.push({
      id: `overdue:${t.id}`,
      priority: 1,
      text: `${firstName(c.name)}'s "${t.title}" is overdue (due ${formatDay(t.day)}).`,
      action: { type: "openCandidate", candidateId: c.id, tab: "assignments", label: "Open" },
    });
  }

  // 2 · Intern with no open task due today.
  for (const c of interns.filter((c) => tier(c) !== "bench" || state.tasks.some((t) => t.candidateId === c.id))) {
    const hasToday = state.tasks.some((t) => t.candidateId === c.id && open(t) && t.day === today);
    if (hasToday) continue;
    const fit = unassigned
      .map((t) => ({ t, score: t.areaId && areaById.get(t.areaId) ? matchScore(c, areaById.get(t.areaId)!) : 0 }))
      .filter((x) => x.score > 0 && (tier(c) !== "bench" || areaById.get(x.t.areaId!)?.level === "small"))
      .sort((a, b) => b.score - a.score || a.t.day.localeCompare(b.t.day))[0];
    out.push({
      id: `idle:${c.id}`,
      priority: 2,
      text: `${firstName(c.name)} has nothing open for today.`,
      action: fit
        ? { type: "assign", taskId: fit.t.id, candidateId: c.id, label: `Give "${fit.t.title}"` }
        : { type: "openAssign", candidateId: c.id, label: "Assign…" },
    });
  }

  // 2 · Finished interview with no score.
  for (const iv of state.interviews.filter((iv) => iv.score == null && interviewPhase(iv, today, nowMin) === "past")) {
    const c = byId.get(iv.candidateId);
    if (!c) continue;
    const who = state.interviewers.find((i) => i.id === iv.interviewerId)?.name ?? "an interviewer";
    out.push({
      id: `score:${iv.id}`,
      priority: 2,
      text: `${c.name}'s ${INTERVIEW_TYPE_LABEL[iv.type].toLowerCase()} with ${who} (${formatDay(iv.date)}) has no score.`,
      action: { type: "openCandidate", candidateId: c.id, tab: "interviews", label: "Score" },
    });
  }

  // 2 · After 17:00, intern who logged time today but has no report.
  if (nowMin >= 17 * 60) {
    const stats = dayStats(today, state, tz, nowMs);
    for (const i of stats.interns.filter((i) => i.minutes > 0 && !i.report)) {
      out.push({
        id: `report:${i.candidate.id}`,
        priority: 2,
        text: `${firstName(i.candidate.name)} logged ${fmtLogged(i.minutes)} today but hasn't sent a report.`,
        action: { type: "openCandidate", candidateId: i.candidate.id, tab: "assignments", label: "Open" },
      });
    }
  }

  // 3 · After 14:00, a task due today that hasn't been started.
  if (nowMin >= 14 * 60) {
    for (const t of state.tasks.filter((t) => t.candidateId && t.status === "todo" && t.day === today)) {
      const c = byId.get(t.candidateId!);
      if (!c) continue;
      out.push({
        id: `unstarted:${t.id}`,
        priority: 3,
        text: `"${t.title}" (${firstName(c.name)}) is due today and hasn't been started.`,
        action: { type: "openCandidate", candidateId: c.id, tab: "assignments", label: "Open" },
      });
    }
  }

  // 3 · Non-benched candidate with no next interview.
  for (const c of state.candidates.filter((c) => tier(c) !== "bench" && c.status !== "decided")) {
    const next = state.interviews.some((iv) => iv.candidateId === c.id && interviewPhase(iv, today, nowMin) !== "past");
    if (next) continue;
    out.push({
      id: `unscheduled:${c.id}`,
      priority: 3,
      text: `${c.name} has no next interview.`,
      action: { type: "openCandidate", candidateId: c.id, tab: "interviews", label: "Schedule" },
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

/** "N clocked in · Xh logged today · N open tasks" */
export function boardSummary(state: Pick<BoardState, "candidates" | "tasks" | "sessions" | "reports">, today: string, tz: string, nowMs: number) {
  const stats = dayStats(today, state, tz, nowMs);
  return {
    clockedIn: state.sessions.filter((s) => !s.endedAt).length,
    minutesToday: stats.totals.minutes,
    openTasks: state.tasks.filter(open).length,
  };
}

/** Mon–Sun week containing `date`. */
export function weekOf(date: string): string[] {
  const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(date, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Pack overlapping interviews of one day into sub-rows (lanes). */
export function lanes<T extends Pick<Interview, "startTime" | "endTime">>(items: T[]): { item: T; lane: number }[] {
  const sorted = [...items].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  const laneEnds: number[] = [];
  return sorted.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= toMin(item.startTime));
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = toMin(item.endTime);
    return { item, lane };
  });
}
