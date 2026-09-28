CREATE TYPE "public"."area_level" AS ENUM('core', 'small');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('work', 'interview');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'doing', 'done');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('priority', 'standard', 'bench');--> statement-breakpoint
ALTER TYPE "public"."activity_kind" ADD VALUE 'task';--> statement-breakpoint
ALTER TYPE "public"."activity_kind" ADD VALUE 'clock';--> statement-breakpoint
ALTER TYPE "public"."activity_kind" ADD VALUE 'report';--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"goal" text DEFAULT '' NOT NULL,
	"brief" text DEFAULT '' NOT NULL,
	"targets" text[] DEFAULT '{}' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"day" date NOT NULL,
	"summary" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"priority_at" integer DEFAULT 8 NOT NULL,
	"bench_at" integer DEFAULT 4 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"kind" "task_kind" DEFAULT 'work' NOT NULL,
	"area_id" uuid,
	"candidate_id" uuid,
	"day" date NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"created_by" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "level" "area_level";--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "fit" numeric(3, 1) DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "tier_override" "tier";--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "fit_before" numeric(3, 1);--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_interviewers_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."interviewers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_candidate_day_idx" ON "reports" USING btree ("candidate_id","day");--> statement-breakpoint
CREATE INDEX "sessions_candidate_idx" ON "sessions" USING btree ("candidate_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_one_open_idx" ON "sessions" USING btree ("candidate_id") WHERE "sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "tasks_candidate_day_idx" ON "tasks" USING btree ("candidate_id","day");--> statement-breakpoint
CREATE INDEX "tasks_day_idx" ON "tasks" USING btree ("day");--> statement-breakpoint
-- v1 stored fit and skill scores on 0–100; v2 uses 1–10.
UPDATE "candidates" SET "fit" = GREATEST(1, LEAST(10, round("fit_score" / 10.0, 1)));--> statement-breakpoint
UPDATE "candidate_skills" SET "score" = GREATEST(1, LEAST(10, round("score" / 10.0))) WHERE "score" > 10;--> statement-breakpoint
UPDATE "areas" SET "level" = 'core' WHERE "kind" = 'area' AND "level" IS NULL;--> statement-breakpoint
INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
