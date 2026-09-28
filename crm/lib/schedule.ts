import type { Interview } from "./types";
import { toMin } from "./time";

export const DEFAULT_WINDOW = { start: 9 * 60, end: 18 * 60 };

/** 09:00–18:00 by default, widened to whole hours that fit every interview on the day. */
export function scheduleWindow(dayInterviews: Pick<Interview, "startTime" | "endTime">[]) {
  let start = DEFAULT_WINDOW.start;
  let end = DEFAULT_WINDOW.end;
  for (const iv of dayInterviews) {
    start = Math.min(start, Math.floor(toMin(iv.startTime) / 60) * 60);
    end = Math.max(end, Math.ceil(toMin(iv.endTime) / 60) * 60);
  }
  return { start, end };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Position of a block inside the timeline track, as percentages of the window. */
export function blockGeometry(iv: Pick<Interview, "startTime" | "endTime">, win: { start: number; end: number }) {
  const span = win.end - win.start;
  const s = toMin(iv.startTime);
  const e = toMin(iv.endTime);
  return { left: round(((s - win.start) / span) * 100), width: round(((e - s) / span) * 100) };
}
