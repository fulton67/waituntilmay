import type { ResumeJson } from "../db/schema";

export type { ResumeJson };

export const STATUSES = ["new", "queued", "inprocess", "awaiting", "decided"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  queued: "Queued",
  inprocess: "In process",
  awaiting: "Awaiting",
  decided: "Decided",
};

export const INTERVIEW_TYPES = ["intro", "portfolio", "technical", "ops_case", "content_review", "final"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  intro: "Intro call",
  portfolio: "Portfolio review",
  technical: "Technical",
  ops_case: "Ops case",
  content_review: "Content review",
  final: "Final",
};

export type AreaKind = "area" | "goal";
export type AreaLevel = "core" | "small";
export type ActivityKind = "note" | "new" | "time" | "status" | "area" | "awaiting" | "task" | "clock" | "report";
export type Tier = "priority" | "standard" | "bench";
export const TIER_LABEL: Record<Tier, string> = { priority: "Priority", standard: "Standard", bench: "Bench" };
export type TaskStatus = "todo" | "doing" | "done";
export type TaskKind = "work" | "interview";
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", doing: "In progress", done: "Done" };

export type Interviewer = { id: string; name: string; email: string; color: string };

export type Skill = { id: string; skill: string; score: number };

export type Candidate = {
  id: string;
  seq: number;
  name: string;
  school: string;
  major: string;
  program: string;
  email: string;
  instagramHandle: string;
  portfolioUrl: string;
  phone: string | null;
  status: Status;
  /** 1–10, one decimal */
  fit: number;
  tierOverride: Tier | null;
  resumeJson: ResumeJson;
  resumeFileUrl: string | null;
  createdAt: string;
  skills: Skill[];
  areaIds: string[];
};

export type Area = { id: string; kind: AreaKind; level: AreaLevel | null; name: string; description: string };

export type Interview = {
  id: string;
  candidateId: string;
  interviewerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  type: InterviewType;
  location: string | null;
  actualMinutes: number | null;
  score: number | null;
  fitBefore: number | null;
  debrief: string | null;
};

export type Settings = { priorityAt: number; benchAt: number };

export type Campaign = {
  id: string;
  name: string;
  goal: string;
  brief: string;
  targets: string[];
  startDate: string;
  endDate: string;
};

export type Task = {
  id: string;
  campaignId: string;
  title: string;
  detail: string;
  kind: TaskKind;
  areaId: string | null;
  candidateId: string | null;
  day: string;
  status: TaskStatus;
  completedAt: string | null;
};

export type Session = {
  id: string;
  taskId: string;
  candidateId: string;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
};

export type Report = { id: string; candidateId: string; day: string; summary: string; submittedAt: string };

export type Note = { id: string; candidateId: string; authorId: string; body: string; createdAt: string };

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle: string;
  candidateId: string | null;
  actorId: string | null;
  createdAt: string;
};

export type CrmData = {
  me: Interviewer;
  interviewers: Interviewer[];
  candidates: Candidate[];
  areas: Area[];
  interviews: Interview[];
  notes: Note[];
  activity: ActivityItem[];
  settings: Settings;
  /** CRM_ALLOWED_EMAILS, for the Settings interviewer list. */
  allowlist: string[];
  campaign: Campaign | null;
  tasks: Task[];
  sessions: Session[];
  reports: Report[];
  /** "today" in the CRM timezone, YYYY-MM-DD */
  today: string;
  tz: string;
  devTools: boolean;
  storage: "supabase" | "local";
  realtime: { url: string; anonKey: string } | null;
};

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export const EMPTY_RESUME: ResumeJson = { summary: "", education: [], experience: [], skills: [] };

/**
 * Everything an intern's page receives — built server-side from their own rows only.
 * No other candidates, notes, scores, fits, rankings or tiers.
 */
export type InternData = {
  viewer: "intern" | "interviewer";
  intern: { id: string; name: string; email: string };
  campaign: Campaign | null;
  tasks: Task[];
  sessions: Session[];
  reports: Report[];
  interviews: (Pick<Interview, "id" | "date" | "startTime" | "endTime" | "type" | "location"> & {
    interviewer: { name: string; color: string };
  })[];
  areas: Pick<Area, "id" | "kind" | "name" | "description">[];
  today: string;
  tz: string;
};
