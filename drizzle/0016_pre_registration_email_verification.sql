-- Pre-registration email verification (OTP before application creation).
-- Abandoned/unverified challenges do NOT reserve email for duplicate protection.

CREATE TABLE IF NOT EXISTS "pre_registration_email_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_normalized" text NOT NULL,
  "email_hash" text NOT NULL,
  "code_hash" text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "verified_at" timestamp with time zone,
  "verification_token_hash" text,
  "verification_expires_at" timestamp with time zone,
  "superseded_at" timestamp with time zone,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pre_reg_email_challenge_email_created_idx"
  ON "pre_registration_email_challenges" ("email_normalized", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pre_reg_email_challenge_token_idx"
  ON "pre_registration_email_challenges" ("verification_token_hash")
  WHERE "verification_token_hash" IS NOT NULL
    AND "consumed_at" IS NULL
    AND "superseded_at" IS NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pre_reg_email_challenge_active_expires_idx"
  ON "pre_registration_email_challenges" ("expires_at")
  WHERE "verified_at" IS NULL AND "superseded_at" IS NULL;
