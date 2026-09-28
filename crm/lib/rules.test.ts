import assert from "node:assert/strict";
import { test } from "node:test";
import { findClash, interviewPhase, statusAfterCompleted, statusAfterSchedule } from "./rules";
import { blockGeometry, scheduleWindow } from "./schedule";
import { suggestArea } from "./suggest";
import { formatDuration } from "./time";

const iv = (id: string, interviewerId: string, startTime: string, endTime: string, date = "2026-09-28") => ({
  id,
  interviewerId,
  date,
  startTime,
  endTime,
});

test("overlap: same interviewer, same day, overlapping times clash", () => {
  const existing = [iv("a", "i1", "11:00", "11:45")];
  assert.equal(findClash({ interviewerId: "i1", date: "2026-09-28", startTime: "11:30", endTime: "12:15" }, existing)?.id, "a");
  assert.equal(findClash({ interviewerId: "i1", date: "2026-09-28", startTime: "10:30", endTime: "11:01" }, existing)?.id, "a");
});

test("overlap: back-to-back, other interviewer, other day do not clash", () => {
  const existing = [iv("a", "i1", "11:00", "11:45")];
  assert.equal(findClash({ interviewerId: "i1", date: "2026-09-28", startTime: "11:45", endTime: "12:30" }, existing), undefined);
  assert.equal(findClash({ interviewerId: "i2", date: "2026-09-28", startTime: "11:00", endTime: "11:45" }, existing), undefined);
  assert.equal(findClash({ interviewerId: "i1", date: "2026-09-29", startTime: "11:00", endTime: "11:45" }, existing), undefined);
});

test("status transitions", () => {
  assert.equal(statusAfterSchedule("new"), "queued");
  assert.equal(statusAfterSchedule("inprocess"), "inprocess");
  assert.equal(statusAfterCompleted("queued"), "inprocess");
  assert.equal(statusAfterCompleted("awaiting"), "awaiting");
  assert.equal(statusAfterCompleted("decided"), "decided");
});

test("interview phase", () => {
  const x = { date: "2026-09-28", startTime: "10:00", endTime: "10:45" };
  assert.equal(interviewPhase(x, "2026-09-28", 9 * 60), "upcoming");
  assert.equal(interviewPhase(x, "2026-09-28", 10 * 60 + 10), "live");
  assert.equal(interviewPhase(x, "2026-09-28", 11 * 60), "past");
  assert.equal(interviewPhase(x, "2026-09-29", 0), "past");
});

test("schedule window defaults to 09:00–18:00 and expands to fit", () => {
  assert.deepEqual(scheduleWindow([]), { start: 540, end: 1080 });
  assert.deepEqual(scheduleWindow([{ startTime: "08:15", endTime: "09:00" }, { startTime: "18:00", endTime: "18:30" }]), {
    start: 480,
    end: 1140,
  });
});

test("block geometry is a percentage of the window", () => {
  assert.deepEqual(blockGeometry({ startTime: "12:00", endTime: "12:45" }, { start: 540, end: 1080 }), { left: 33.333, width: 8.333 });
});

test("duration format", () => {
  assert.equal(formatDuration(65), "1h 05m");
  assert.equal(formatDuration(45), "45m");
  assert.equal(formatDuration(0), "—");
});

test("area suggestion from skills", () => {
  const areas = [
    { id: "a1", kind: "area" as const, level: "core" as const, name: "Web & creative dev", description: "Sites, 3D, Shopify builds" },
    { id: "a4", kind: "area" as const, level: "core" as const, name: "Brand & design", description: "Identity, print, apparel graphics" },
    { id: "g1", kind: "goal" as const, level: null, name: "Merch drop", description: "" },
  ];
  const resume = { summary: "", education: [], experience: [], skills: [] };
  const dev = suggestArea({ skills: [{ id: "s", skill: "Frontend & creative dev", score: 92 }], resumeJson: resume }, areas);
  const design = suggestArea({ skills: [{ id: "s", skill: "Typography", score: 88 }], resumeJson: resume }, areas);
  assert.equal(dev?.id, "a1");
  assert.equal(design?.id, "a4");
});
