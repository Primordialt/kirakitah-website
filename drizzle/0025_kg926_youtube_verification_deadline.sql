-- KG926 YouTube verification deadline configuration history.
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'TOURNAMENT_ELIGIBILITY_CONFIG_VIEWED';--> statement-breakpoint
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'TOURNAMENT_ELIGIBILITY_CONFIG_CHANGED';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eligibility_config_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" text NOT NULL,
  "rules_version" text NOT NULL,
  "previous_deadline" timestamp with time zone,
  "new_deadline" timestamp with time zone,
  "change_reason" text NOT NULL,
  "changed_by" text NOT NULL,
  "effective_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "eligibility_config_history"
  ADD CONSTRAINT "eligibility_config_history_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eligibility_config_history_tournament_idx"
  ON "eligibility_config_history" USING btree ("tournament_id", "effective_at");--> statement-breakpoint
-- Explicit null deadline — no automatic penalty until Product Owner configures a deadline.
UPDATE "tournaments"
SET
  "eligibility_rules" = (
    COALESCE("eligibility_rules", '{}'::jsonb)
    || jsonb_build_object('youtubeVerificationDeadline', null)
  ),
  "updated_at" = now()
WHERE "id" = 'event-kg926';
