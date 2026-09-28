import { interviewPhase } from "../lib/rules";
import { tierOf } from "../lib/ranking";
import { addDays } from "../lib/time";
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
  const phase = (iv: (typeof todays)[number]) => (nowMin == null ? "upcoming" : interviewPhase(iv, today, nowMin));
  const phases = todays.map(phase);
  const upcomingByCandidate = new Set(
    data.interviews.filter((iv) => iv.date > today || (iv.date === today && phase(iv) !== "past")).map((iv) => iv.candidateId),
  );
  const areaCounts = data.areas.map((a) => ({ area: a, count: data.candidates.filter((c) => c.areaIds.includes(a.id)).length }));

  return {
    today: todays.length,
    tomorrow: data.interviews.filter((iv) => iv.date === tomorrow).length,
    inProgress: phases.filter((p) => p === "live").length,
    toCome: phases.filter((p) => p === "upcoming").length,
    finished: phases.filter((p) => p === "past").length,
    needScheduling: data.candidates.filter(
      (c) =>
        (c.status === "new" || c.status === "queued" || c.status === "inprocess") &&
        tierOf(c, data.settings) !== "bench" &&
        !upcomingByCandidate.has(c.id),
    ).length,
    awaiting: data.candidates.filter((c) => c.status === "awaiting").length,
    areaCounts,
  };
}
