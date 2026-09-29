CREATE TYPE "public"."join_role" AS ENUM('interviewer', 'intern');--> statement-breakpoint
CREATE TABLE "auth_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_joins" (
	"email" text PRIMARY KEY NOT NULL,
	"role" "join_role" NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"school" text DEFAULT '' NOT NULL,
	"major" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "self_joined" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "interviewers" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "interviewer_invite" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "interviewer_invite_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "intern_invite" text;--> statement-breakpoint
CREATE INDEX "auth_attempts_bucket_idx" ON "auth_attempts" USING btree ("bucket","created_at");