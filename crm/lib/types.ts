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
export type ActivityKind = "note" | "new" | "time" | "status" | "area" | "awaiting";

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
  fitScore: number;
  resumeJson: ResumeJson;
  resumeFileUrl: string | null;
  createdAt: string;
  skills: Skill[];
  areaIds: string[];
};

export type Area = { id: string; kind: AreaKind; name: string; description: string };

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
  debrief: string | null;
};

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
  /** "today" in the CRM timezone, YYYY-MM-DD */
  today: string;
  tz: string;
  devTools: boolean;
  storage: "supabase" | "local";
  realtime: { url: string; anonKey: string } | null;
};

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export const EMPTY_RESUME: ResumeJson = { summary: "", education: [], experience: [], skills: [] };
