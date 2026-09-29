import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  serial,
  jsonb,
  date,
  time,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const candidateStatus = pgEnum("candidate_status", ["new", "queued", "inprocess", "awaiting", "decided"]);
export const areaKind = pgEnum("area_kind", ["area", "goal"]);
export const interviewType = pgEnum("interview_type", [
  "intro",
  "portfolio",
  "technical",
  "ops_case",
  "content_review",
  "final",
]);
export const activityKind = pgEnum("activity_kind", [
  "note",
  "new",
  "time",
  "status",
  "area",
  "awaiting",
  "task",
  "clock",
  "report",
]);
export const tierKind = pgEnum("tier", ["priority", "standard", "bench"]);
export const areaLevel = pgEnum("area_level", ["core", "small"]);
export const taskKind = pgEnum("task_kind", ["work", "interview"]);
export const taskStatus = pgEnum("task_status", ["todo", "doing", "done"]);

/** numeric(3,1) arrives from postgres as a string; map it to a number. */
const fitColumn = (name: string) => numeric(name, { precision: 3, scale: 1, mode: "number" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const interviewers = pgTable("interviewers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  color: text("color").notNull(),
  /** Set when removed in Settings: no access, but their name stays on interviews and notes. */
  removedAt: timestamp("removed_at", { withTimezone: true }),
  ...timestamps,
});

export type ResumeJson = {
  summary: string;
  education: { school: string; degree: string; years: string }[];
  experience: { org: string; role: string; years: string; bullets: string[] }[];
  skills: string[];
};

export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Human-friendly record number shown as #0001 in the table and activity feed.
  seq: serial("seq").notNull(),
  name: text("name").notNull(),
  school: text("school").notNull().default(""),
  major: text("major").notNull().default(""),
  program: text("program").notNull().default(""),
  email: text("email").notNull().default(""),
  instagramHandle: text("instagram_handle").notNull().default(""),
  portfolioUrl: text("portfolio_url").notNull().default(""),
  phone: text("phone"),
  status: candidateStatus("status").notNull().default("new"),
  /** 1–10, one decimal. Set by hand, or moved to the interview average whenever an interview is scored. */
  fit: fitColumn("fit").notNull().default(5),
  /** null = automatic tier from the settings bands. */
  tierOverride: tierKind("tier_override"),
  resumeJson: jsonb("resume_json").$type<ResumeJson>().notNull(),
  resumeFileUrl: text("resume_file_url"),
  createdBy: uuid("created_by").references(() => interviewers.id, { onDelete: "set null" }),
  /** Created from the intern invite link rather than by an interviewer. */
  selfJoined: boolean("self_joined").notNull().default(false),
  ...timestamps,
});

export const candidateSkills = pgTable(
  "candidate_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    score: integer("score").notNull(), // 1–10
    ...timestamps,
  },
  (t) => [index("candidate_skills_candidate_idx").on(t.candidateId)],
);

export const areas = pgTable("areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: areaKind("kind").notNull(),
  /** core or small job; null for goals. Benched candidates can only attach to small jobs. */
  level: areaLevel("level"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  ...timestamps,
});

export const candidateAreas = pgTable(
  "candidate_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("candidate_areas_pair_idx").on(t.candidateId, t.areaId)],
);

export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    interviewerId: uuid("interviewer_id")
      .notNull()
      .references(() => interviewers.id, { onDelete: "restrict" }),
    date: date("date", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    type: interviewType("type").notNull(),
    location: text("location"),
    actualMinutes: integer("actual_minutes"),
    /** Interviewer's rating, 1–10. */
    score: integer("score"),
    /** The candidate's fit just before this interview was scored — drives the ↑/↓ delta and baseline. */
    fitBefore: fitColumn("fit_before"),
    debrief: text("debrief"),
    ...timestamps,
  },
  (t) => [
    index("interviews_date_idx").on(t.date),
    index("interviews_interviewer_date_idx").on(t.interviewerId, t.date),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => interviewers.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [index("notes_candidate_idx").on(t.candidateId)],
);

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: activityKind("kind").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => interviewers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("activity_created_idx").on(t.createdAt)],
);

/** Single row. Absolute bands on the 1–10 fit, never percentiles. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  priorityAt: integer("priority_at").notNull().default(8),
  benchAt: integer("bench_at").notNull().default(4),
  /** Invite links: /crm/join/interviewer/<token> (expires) and /crm/join/intern/<token> (doesn't). */
  interviewerInvite: text("interviewer_invite"),
  interviewerInviteExpiresAt: timestamp("interviewer_invite_expires_at", { withTimezone: true }),
  internInvite: text("intern_invite"),
  ...timestamps,
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  goal: text("goal").notNull().default(""),
  brief: text("brief").notNull().default(""),
  targets: text("targets").array().notNull().default([]),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  ...timestamps,
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    kind: taskKind("kind").notNull().default("work"),
    areaId: uuid("area_id").references(() => areas.id, { onDelete: "set null" }),
    /** null = unassigned */
    candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    day: date("day", { mode: "string" }).notNull(),
    status: taskStatus("status").notNull().default("todo"),
    createdBy: uuid("created_by").references(() => interviewers.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("tasks_candidate_day_idx").on(t.candidateId, t.day), index("tasks_day_idx").on(t.day)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("sessions_candidate_idx").on(t.candidateId, t.startedAt),
    // One open session per candidate, enforced by the database as well as the server action.
    uniqueIndex("sessions_one_open_idx").on(t.candidateId).where(sql`${t.endedAt} is null`),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    summary: text("summary").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex("reports_candidate_day_idx").on(t.candidateId, t.day)],
);

/** "Next up" proposals an interviewer dismissed for a day (keyed by the proposal's stable key). */
export const dismissals = pgTable(
  "dismissals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewerId: uuid("interviewer_id")
      .notNull()
      .references(() => interviewers.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    key: text("key").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("dismissals_unique_idx").on(t.interviewerId, t.day, t.key)],
);

export const joinRole = pgEnum("join_role", ["interviewer", "intern"]);

/**
 * What someone typed on a join page, held until they verify their email (link or code). The
 * invite token is re-checked at verification, so regenerating a link also voids pending joins.
 */
export const pendingJoins = pgTable("pending_joins", {
  email: text("email").primaryKey(),
  role: joinRole("role").notNull(),
  token: text("token").notNull(),
  name: text("name").notNull(),
  school: text("school").notNull().default(""),
  major: text("major").notNull().default(""),
  ...timestamps,
});

/** One row per sign-in, join or code attempt; counted over a sliding window for rate limits. */
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucket: text("bucket").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_attempts_bucket_idx").on(t.bucket, t.createdAt)],
);
