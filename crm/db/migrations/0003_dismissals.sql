CREATE TABLE "dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interviewer_id" uuid NOT NULL,
	"day" date NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dismissals" ADD CONSTRAINT "dismissals_interviewer_id_interviewers_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."interviewers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dismissals_unique_idx" ON "dismissals" USING btree ("interviewer_id","day","key");