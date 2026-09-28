import type { Interview, Status } from "./types";
import { toMin } from "./time";

type Slot = Pick<Interview, "id" | "interviewerId" | "date" | "startTime" | "endTime">;

/** Returns the first existing interview that overlaps `next` for the same interviewer on the same date. */
export function findClash<T extends Slot>(next: Omit<Slot, "id"> & { id?: string }, existing: T[]): T | undefined {
  const s = toMin(next.startTime);
  const e = toMin(next.endTime);
  return existing.find(
    (iv) =>
      iv.id !== next.id &&
      iv.interviewerId === next.interviewerId &&
      iv.date === next.date &&
      s < toMin(iv.endTime) &&
      toMin(iv.startTime) < e,
  );
}

/** Scheduling a new candidate moves them to queued. */
export function statusAfterSchedule(status: Status): Status {
  return status === "new" ? "queued" : status;
}

/** Logging the first completed interview moves them to in process, unless already awaiting or decided. */
export function statusAfterCompleted(status: Status): Status {
  return status === "awaiting" || status === "decided" ? status : "inprocess";
}

export type Phase = "past" | "live" | "upcoming";

export function interviewPhase(iv: Pick<Interview, "date" | "startTime" | "endTime">, today: string, nowMin: number): Phase {
  if (iv.date < today) return "past";
  if (iv.date > today) return "upcoming";
  if (nowMin >= toMin(iv.endTime)) return "past";
  if (nowMin >= toMin(iv.startTime)) return "live";
  return "upcoming";
}

export function plannedMinutes(iv: Pick<Interview, "startTime" | "endTime">): number {
  return toMin(iv.endTime) - toMin(iv.startTime);
}
