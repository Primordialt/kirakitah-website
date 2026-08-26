-- Participant accounts, profiles, sessions, and application linkage.
-- Does not backfill registration_applications.participant_account_id.

CREATE TYPE "public"."participant_profile_status" AS ENUM(
  'incomplete',
  'submitted_for_review',
  'needs_correction',
  'verified'
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "participant_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "email_normalized" text NOT NULL,
  "username" text NOT NULL,
  "username_normalized" text NOT NULL,
  "password_hash" text NOT NULL,
  "email_verified_at" timestamp with time zone,
  "active" boolean DEFAULT true NOT NULL,
  "failed_login_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "participant_accounts_email_normalized_uidx"
  ON "participant_accounts" ("email_normalized");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "participant_accounts_username_normalized_uidx"
  ON "participant_accounts" ("username_normalized");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "participant_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "status" "participant_profile_status" DEFAULT 'incomplete' NOT NULL,
  "first_name" text,
  "last_name" text,
  "date_of_birth" date,
  "country" text,
  "city" text,
  "phone" text,
  "phone_normalized" text,
  "identification_type" "identification_type",
  "identification_number_hash" text,
  "identification_number_encrypted" text,
  "gamer_tag" text,
  "player_photo_blob_key" text,
  "player_photo_meta" jsonb,
  "guardian" jsonb,
  "completion_percent" integer DEFAULT 0 NOT NULL,
  "submitted_at" timestamp with time zone,
  "verified_at" timestamp with time zone,
  "verified_by" text,
  "correction_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "participant_profiles"
    ADD CONSTRAINT "participant_profiles_account_id_participant_accounts_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."participant_accounts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "participant_profiles_account_id_uidx"
  ON "participant_profiles" ("account_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_profiles_status_idx"
  ON "participant_profiles" ("status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "participant_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "participant_sessions"
    ADD CONSTRAINT "participant_sessions_account_id_participant_accounts_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."participant_accounts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "participant_sessions_token_hash_uidx"
  ON "participant_sessions" ("token_hash");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_sessions_account_id_idx"
  ON "participant_sessions" ("account_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_sessions_expires_at_idx"
  ON "participant_sessions" ("expires_at")
  WHERE "revoked_at" IS NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "participant_login_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key_hash" text NOT NULL,
  "attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_login_attempts_key_attempted_idx"
  ON "participant_login_attempts" ("key_hash", "attempted_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "participant_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid,
  "event_type" text NOT NULL,
  "actor" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "participant_audit_events"
    ADD CONSTRAINT "participant_audit_events_account_id_participant_accounts_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."participant_accounts"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_audit_events_account_created_idx"
  ON "participant_audit_events" ("account_id", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_audit_events_type_created_idx"
  ON "participant_audit_events" ("event_type", "created_at");--> statement-breakpoint

ALTER TABLE "registration_applications"
  ADD COLUMN IF NOT EXISTS "participant_account_id" uuid;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "registration_applications"
    ADD CONSTRAINT "registration_applications_participant_account_id_fk"
    FOREIGN KEY ("participant_account_id") REFERENCES "public"."participant_accounts"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "registration_applications_participant_account_id_idx"
  ON "registration_applications" ("participant_account_id");
