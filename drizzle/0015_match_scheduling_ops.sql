-- Backend Step 10 ops: schedule history + match notification events (email/SMS deferred).
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_NOTIFICATION_CREATED';--> statement-breakpoint

CREATE TYPE "public"."match_notification_event_type" AS ENUM(
  'MATCH_SCHEDULED',
  'MATCH_RESCHEDULED',
  'MATCH_REMINDER',
  'MATCH_CANCELLED'
);--> statement-breakpoint

CREATE TYPE "public"."match_notification_delivery_status" AS ENUM(
  'pending',
  'recorded',
  'delivered',
  'failed'
);--> statement-breakpoint

CREATE TYPE "public"."match_schedule_history_action" AS ENUM(
  'scheduled',
  'rescheduled',
  'cancelled'
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "match_schedule_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "tournament_id" text NOT NULL,
  "action" "match_schedule_history_action" NOT NULL,
  "previous_scheduled_at" timestamp with time zone,
  "previous_window_start" timestamp with time zone,
  "previous_window_end" timestamp with time zone,
  "previous_timezone" text,
  "scheduled_at" timestamp with time zone,
  "scheduled_window_start" timestamp with time zone,
  "scheduled_window_end" timestamp with time zone,
  "timezone" text,
  "reason" text,
  "actor_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "match_schedule_history" ADD CONSTRAINT "match_schedule_history_match_id_fk"
    FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "match_schedule_history" ADD CONSTRAINT "match_schedule_history_tournament_id_fk"
    FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "match_schedule_history_match_idx"
  ON "match_schedule_history" ("match_id", "created_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "match_notification_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" "match_notification_event_type" NOT NULL,
  "match_id" uuid NOT NULL,
  "tournament_id" text NOT NULL,
  "recipient_participant_id" uuid,
  "delivery_status" "match_notification_delivery_status" DEFAULT 'recorded' NOT NULL,
  "channel" text DEFAULT 'internal' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "match_notification_events" ADD CONSTRAINT "match_notification_events_match_id_fk"
    FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "match_notification_events" ADD CONSTRAINT "match_notification_events_tournament_id_fk"
    FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "match_notification_events" ADD CONSTRAINT "match_notification_events_participant_id_fk"
    FOREIGN KEY ("recipient_participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "match_notification_events_match_idx"
  ON "match_notification_events" ("match_id", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "match_notification_events_participant_idx"
  ON "match_notification_events" ("recipient_participant_id", "created_at");
