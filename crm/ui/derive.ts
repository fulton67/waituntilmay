import { interviewPhase } from "../lib/rules";
import { addDays, toMin } from "../lib/time";
import type { Candidate, CrmData, Interview } from "../lib/types";

export function candidateInterviews(data: CrmData, candidateId: string) {
  return data.interviews.filter((iv) => iv.candidateId === candidateId);
}

export function timeSpent(interviews: Interview[]) {
  return interviews.reduce((sum, iv) => sum + (iv.actualMinutes ?? 0), 0);
}

const sortKey = (iv: Interview) => `${iv.date} ${iv.startTime}`;

/** Next interview that hasn't finished yet (live counts as next). */
export function nextInterview(interviews: Interview[], today: string, nowMin: number | null) {
  return interviews
    .filter((iv) => (nowMin == null ? iv.date >= today : interviewPhase(iv, today, nowMin) !== "past"))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))[0];
}

export function lastInterview(interviews: Interview[]) {
  return [...interviews].sort((a, b) => sortKey(b).localeCompare(sortKey(a)))[0];
}

export type Row = {
  candidate: Candidate;
  next?: Interview;
  interviewerId?: string;
  spent: number;
  areaName?: string;
  goalName?: string;
};

export function candidateRows(data: CrmData, nowMin: number | null): Row[] {
  const areaById = new Map(data.areas.map((a) => [a.id, a]));
  return data.candidates.map((candidate) => {
    const ivs = candidateInterviews(data, candidate.id);
    const next = nextInterview(ivs, data.today, nowMin);
    const attached = candidate.areaIds.map((id) => areaById.get(id)).filter(Boolean);
    return {
      candidate,
      next,
      interviewerId: (next ?? lastInterview(ivs))?.interviewerId,
      spent: timeSpent(ivs),
      areaName: attached.find((a) => a!.kind === "area")?.name,
      goalName: attached.find((a) => a!.kind === "goal")?.name,
    };
  });
}

export function kpis(data: CrmData, nowMin: number | null) {
  const today = data.today;
  const tomorrow = addDays(today, 1);
  const todays = data.interviews.filter((iv) => iv.date === today);
  const phases = todays.map((iv) => (nowMin == null ? "upcoming" : interviewPhase(iv, today, nowMin)));
  const upcomingByCandidate = new Set(
    data.interviews.filter((iv) => iv.date > today || (iv.date === today && phases[todays.indexOf(iv)] !== "past")).map((iv) => iv.candidateId),
  );

  // Load = booked minutes today + tomorrow over two 9-hour interview days.
  const load = data.interviewers.map((person) => {
    const booked = data.interviews
      .filter((iv) => iv.interviewerId === person.id && (iv.date === today || iv.date === tomorrow))
      .reduce((s, iv) => s + toMin(iv.endTime) - toMin(iv.startTime), 0);
    return { person, pct: Math.min(100, Math.round((booked / (2 * 9 * 60)) * 100)) };
  });

  const byCreated = [...data.candidates].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let running = 0;
  const fitTrend = byCreated.map((c, i) => {
    running += c.fitScore;
    return Math.round(running / (i + 1));
  });

  const areaCounts = data.areas.map((a) => ({ area: a, count: data.candidates.filter((c) => c.areaIds.includes(a.id)).length }));

  return {
    today: todays.length,
    tomorrow: data.interviews.filter((iv) => iv.date === tomorrow).length,
    inProgress: phases.filter((p) => p === "live").length,
    toCome: phases.filter((p) => p === "upcoming").length,
    finished: phases.filter((p) => p === "past").length,
    needScheduling: data.candidates.filter(
      (c) => (c.status === "new" || c.status === "queued" || c.status === "inprocess") && !upcomingByCandidate.has(c.id),
    ).length,
    awaiting: data.candidates.filter((c) => c.status === "awaiting").length,
    load,
    avgLoad: load.length ? Math.round(load.reduce((s, l) => s + l.pct, 0) / load.length) : 0,
    avgFit: data.candidates.length ? Math.round(data.candidates.reduce((s, c) => s + c.fitScore, 0) / data.candidates.length) : 0,
    fitTrend,
    areaCounts,
  };
}
