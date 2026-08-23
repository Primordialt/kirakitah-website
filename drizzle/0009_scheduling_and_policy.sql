-- Backend Step 10: KG926 match scheduling + competition policy history

CREATE TYPE "public"."match_scheduling_status" AS ENUM('unscheduled', 'scheduled', 'reschedule_requested', 'cancelled');--> statement-breakpoint

ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_RESCHEDULED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_SCHEDULE_CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_ACTIVATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_RULES_VIEWED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'COMPETITION_POLICY_VIEWED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'COMPETITION_POLICY_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'NO_SHOW_RECORDED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'DISCONNECT_RESOLVED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'DISPUTE_RESOLVED';--> statement-breakpoint

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "timezone" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scheduled_window_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scheduled_window_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scheduling_status" "match_scheduling_status" DEFAULT 'unscheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scheduled_by" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "schedule_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "schedule_cancel_reason" text;--> statement-breakpoint

-- Backfill existing rows that already have scheduled_at
UPDATE "matches"
SET "scheduling_status" = 'scheduled',
    "schedule_updated_at" = COALESCE("updated_at", now())
WHERE "scheduled_at" IS NOT NULL
  AND "scheduling_status" = 'unscheduled';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "matches_participant_a_scheduled_idx"
  ON "matches" ("participant_a_id", "scheduled_at")
  WHERE "scheduled_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_participant_b_scheduled_idx"
  ON "matches" ("participant_b_id", "scheduled_at")
  WHERE "scheduled_at" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "competition_policy_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" text NOT NULL,
	"rules_version" text NOT NULL,
	"configuration" jsonb NOT NULL,
	"change_reason" text NOT NULL,
	"changed_by" text NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "competition_policy_history" ADD CONSTRAINT "competition_policy_history_tournament_id_fk"
    FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "competition_policy_history_tournament_idx"
  ON "competition_policy_history" ("tournament_id", "effective_at");--> statement-breakpoint

-- Seed current KG926 policy snapshot (idempotent if already present for this version)
INSERT INTO "competition_policy_history" (
  "tournament_id",
  "rules_version",
  "configuration",
  "change_reason",
  "changed_by"
)
SELECT
  'event-kg926',
  'kg926-v1',
  COALESCE(t."competition_rules", '{}'::jsonb),
  'Step 10 baseline policy snapshot',
  'system'
FROM "tournaments" t
WHERE t."id" = 'event-kg926'
  AND NOT EXISTS (
    SELECT 1 FROM "competition_policy_history" h
    WHERE h."tournament_id" = 'event-kg926'
      AND h."rules_version" = 'kg926-v1'
      AND h."change_reason" = 'Step 10 baseline policy snapshot'
  );
