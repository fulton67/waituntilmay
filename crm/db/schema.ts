import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  serial,
  jsonb,
  date,
  time,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

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
export const activityKind = pgEnum("activity_kind", ["note", "new", "time", "status", "area", "awaiting"]);

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
  fitScore: integer("fit_score").notNull().default(50),
  resumeJson: jsonb("resume_json").$type<ResumeJson>().notNull(),
  resumeFileUrl: text("resume_file_url"),
  createdBy: uuid("created_by").references(() => interviewers.id, { onDelete: "set null" }),
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
    score: integer("score").notNull(),
    ...timestamps,
  },
  (t) => [index("candidate_skills_candidate_idx").on(t.candidateId)],
);

export const areas = pgTable("areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: areaKind("kind").notNull(),
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
