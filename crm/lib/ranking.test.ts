import assert from "node:assert/strict";
import { test } from "node:test";
import {
  autoTier,
  dayStats,
  fitDelta,
  lanes,
  narrative,
  proposals,
  ranked,
  scaleFloor,
  suggestAssignee,
  tierOf,
  weekOf,
} from "./ranking";
import type { Area, Candidate, Interview, Session, Task } from "./types";

const S = { priorityAt: 8, benchAt: 4 };
const resume = { summary: "", education: [], experience: [], skills: [] };
const cand = (id: string, name: string, fit: number, skills: [string, number][] = [], tierOverride: Candidate["tierOverride"] = null): Candidate => ({
  id,
  seq: 1,
  name,
  school: "",
  major: "",
  program: "",
  email: "",
  instagramHandle: "",
  portfolioUrl: "",
  phone: null,
  status: "inprocess",
  fit,
  tierOverride,
  resumeJson: resume,
  resumeFileUrl: null,
  createdAt: "2026-09-01T00:00:00Z",
  skills: skills.map(([skill, score], i) => ({ id: `${id}${i}`, skill, score })),
  areaIds: [],
});
const web: Area = { id: "a1", kind: "area", level: "core", name: "Web & creative dev", description: "Sites, 3D, Shopify builds" };
const street: Area = { id: "s1", kind: "area", level: "small", name: "Clip sourcing", description: "Finding moments in long streams" };

test("tiers are absolute bands, override wins", () => {
  assert.equal(autoTier(8, S), "priority");
  assert.equal(autoTier(7.9, S), "standard");
  assert.equal(autoTier(4, S), "bench");
  assert.equal(tierOf({ fit: 9, tierOverride: "bench" }, S), "bench");
  // Everyone strong → everyone priority; nobody benched for finishing last.
  assert.deepEqual([9, 8.5, 8].map((f) => autoTier(f, S)), ["priority", "priority", "priority"]);
});

test("ranking: fit desc, ties by name", () => {
  const r = ranked([cand("1", "Zed", 8), cand("2", "Amy", 8), cand("3", "Bo", 9)]);
  assert.deepEqual(r.map((c) => c.name), ["Bo", "Amy", "Zed"]);
});

test("scale floor", () => {
  assert.equal(scaleFloor([6.2, 9, 7]), 5);
  assert.equal(scaleFloor([1.5, 9]), 1);
  assert.equal(scaleFloor([9.5, 10]), 6);
});

test("delta is fit now minus fit before the last scored interview", () => {
  const iv = (id: string, date: string, score: number | null, fitBefore: number | null): Interview => ({
    id,
    candidateId: "c",
    interviewerId: "i",
    date,
    startTime: "10:00",
    endTime: "10:30",
    type: "intro",
    location: null,
    actualMinutes: null,
    score,
    fitBefore,
    debrief: null,
  });
  assert.equal(fitDelta({ id: "c", fit: 8.5 }, [iv("a", "2026-09-01", 8, 7), iv("b", "2026-09-02", 9, 8)]), 0.5);
  assert.equal(fitDelta({ id: "c", fit: 8 }, [iv("a", "2026-09-01", null, null)]), null);
});

test("suggestAssignee: best skill match, bench only for small jobs, never a non-match", () => {
  const pranav = cand("p", "Pranav R.", 8, [["Frontend & creative dev", 9]]);
  const golam = cand("g", "Golam H.", 7, [["Short-form editing", 9]]);
  const benchDev = cand("b", "Bench Dev", 3, [["Frontend & creative dev", 10]]);
  const pick = suggestAssignee(web, [pranav, golam, benchDev], S);
  assert.equal(pick.pick?.id, "p");
  const onlyBench = suggestAssignee(web, [golam, benchDev], S);
  assert.equal(onlyBench.pick, null);
  assert.match(onlyBench.message, /Bench/);
  const benchEditor = cand("e", "Bench Editor", 3, [["Short-form editing", 9]]);
  assert.equal(suggestAssignee(street, [benchEditor], S).pick?.id, "e");
});

test("day stats + narrative", () => {
  const tasks: Task[] = [
    { id: "t1", campaignId: "k", title: "Landing page", detail: "", kind: "work", areaId: null, candidateId: "p", day: "2026-09-28", status: "doing", completedAt: null },
  ];
  const sessions: Session[] = [
    { id: "s1", taskId: "t1", candidateId: "p", startedAt: "2026-09-28T14:00:00Z", endedAt: "2026-09-28T16:45:00Z", note: "hero done" },
  ];
  const stats = dayStats("2026-09-28", { candidates: [cand("p", "Pranav R.", 8)], tasks, sessions, reports: [] }, "America/New_York", Date.parse("2026-09-28T20:00:00Z"));
  assert.equal(stats.totals.minutes, 165);
  const text = narrative(stats, { name: "GTM", startDate: "2026-09-27" }, () => "Landing page");
  assert.equal(text, "Day 2 of GTM: 1 intern logged 2h 45m across 1 task, 0 finished, 0 reports in. Pranav logged 2h 45m on Landing page — no report yet.");
});

test("proposals: unassigned due task comes first with a skill-matched assignee", () => {
  const pranav = cand("p", "Pranav R.", 8, [["Frontend & creative dev", 9]]);
  const tasks: Task[] = [
    { id: "t1", campaignId: "k", title: "Campus page", detail: "", kind: "work", areaId: "a1", candidateId: null, day: "2026-09-28", status: "todo", completedAt: null },
  ];
  const out = proposals(
    { candidates: [pranav], interviewers: [], areas: [web], tasks, sessions: [], interviews: [], reports: [], settings: S },
    { today: "2026-09-28", nowMin: 600, nowMs: 0, tz: "America/New_York" },
  );
  assert.equal(out[0].priority, 1);
  assert.deepEqual(out[0].action, { type: "assign", taskId: "t1", candidateId: "p", label: "Assign Pranav" });
});

test("week + lanes", () => {
  assert.deepEqual(weekOf("2026-09-30"), ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  const l = lanes([
    { startTime: "10:00", endTime: "11:00" },
    { startTime: "10:30", endTime: "11:15" },
    { startTime: "11:00", endTime: "11:30" },
  ]);
  assert.deepEqual(l.map((x) => x.lane), [0, 1, 0]);
});
