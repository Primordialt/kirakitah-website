-- Participant password reset tokens (hashed at rest; single-use; 1h TTL).

CREATE TABLE IF NOT EXISTS "participant_password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "participant_password_reset_tokens"
    ADD CONSTRAINT "participant_password_reset_tokens_account_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."participant_accounts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "participant_password_reset_tokens_token_hash_uidx"
  ON "participant_password_reset_tokens" ("token_hash");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_password_reset_tokens_account_id_idx"
  ON "participant_password_reset_tokens" ("account_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "participant_password_reset_tokens_expires_at_idx"
  ON "participant_password_reset_tokens" ("expires_at")
  WHERE "used_at" IS NULL;
