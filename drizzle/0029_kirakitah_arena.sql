CREATE TYPE "public"."kk_wallet_ledger_type" AS ENUM(
  'deposit',
  'withdrawal',
  'arena_entry',
  'arena_prize',
  'adjustment',
  'refund'
);

CREATE TYPE "public"."kk_wallet_external_status" AS ENUM(
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE "public"."arena_kind" AS ENUM('quickfire', 'typerush');

CREATE TYPE "public"."arena_round_state" AS ENUM(
  'waiting_for_players',
  'countdown',
  'active',
  'resolving',
  'disqualified',
  'no_winner',
  'completed',
  'intermission',
  'paused'
);

CREATE TYPE "public"."arena_activity_kind" AS ENUM(
  'joined',
  'round_started',
  'round_ended',
  'winner',
  'disqualified',
  'no_winner',
  'streak'
);

CREATE TABLE "kk_wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participant_account_id" uuid NOT NULL,
  "balance_milli" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "kk_wallets_balance_milli_nonneg" CHECK ("balance_milli" >= 0)
);

ALTER TABLE "kk_wallets"
  ADD CONSTRAINT "kk_wallets_participant_account_id_participant_accounts_id_fk"
  FOREIGN KEY ("participant_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "kk_wallets_participant_uidx" ON "kk_wallets" USING btree ("participant_account_id");

CREATE TABLE "kk_wallet_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wallet_id" uuid NOT NULL,
  "entry_type" "kk_wallet_ledger_type" NOT NULL,
  "amount_milli" bigint NOT NULL,
  "balance_before_milli" bigint NOT NULL,
  "balance_after_milli" bigint NOT NULL,
  "idempotency_key" text,
  "reference_type" text,
  "reference_id" uuid,
  "description" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "kk_wallet_ledger"
  ADD CONSTRAINT "kk_wallet_ledger_wallet_id_kk_wallets_id_fk"
  FOREIGN KEY ("wallet_id") REFERENCES "public"."kk_wallets"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "kk_wallet_ledger_idempotency_uidx" ON "kk_wallet_ledger" USING btree ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX "kk_wallet_ledger_wallet_created_idx" ON "kk_wallet_ledger" USING btree ("wallet_id", "created_at" DESC);

CREATE TABLE "kk_wallet_deposits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wallet_id" uuid NOT NULL,
  "amount_milli" bigint NOT NULL,
  "status" "kk_wallet_external_status" DEFAULT 'pending' NOT NULL,
  "provider" text,
  "external_reference" text,
  "ledger_entry_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "kk_wallet_deposits"
  ADD CONSTRAINT "kk_wallet_deposits_wallet_id_kk_wallets_id_fk"
  FOREIGN KEY ("wallet_id") REFERENCES "public"."kk_wallets"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE "kk_wallet_withdrawals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wallet_id" uuid NOT NULL,
  "amount_milli" bigint NOT NULL,
  "status" "kk_wallet_external_status" DEFAULT 'pending' NOT NULL,
  "destination_hint" text,
  "ledger_entry_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "kk_wallet_withdrawals"
  ADD CONSTRAINT "kk_wallet_withdrawals_wallet_id_kk_wallets_id_fk"
  FOREIGN KEY ("wallet_id") REFERENCES "public"."kk_wallets"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE "arenas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "kind" "arena_kind" NOT NULL,
  "description" text NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "paused" boolean DEFAULT false NOT NULL,
  "entry_fee_milli" bigint DEFAULT 500 NOT NULL,
  "prize_milli" bigint DEFAULT 6000 NOT NULL,
  "min_unique_responders" integer DEFAULT 10 NOT NULL,
  "round_duration_seconds" integer DEFAULT 30 NOT NULL,
  "intermission_seconds" integer DEFAULT 10 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "arenas_slug_uidx" ON "arenas" USING btree ("slug");

CREATE TABLE "arena_quickfire_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question" text NOT NULL,
  "option_a" text NOT NULL,
  "option_b" text NOT NULL,
  "option_c" text NOT NULL,
  "option_d" text NOT NULL,
  "correct_option" text NOT NULL,
  "explanation" text,
  "category" text,
  "difficulty" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "arena_typerush_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_text" text NOT NULL,
  "normalized_text" text NOT NULL,
  "category" text,
  "difficulty" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "arena_rounds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "arena_id" uuid NOT NULL,
  "round_number" integer NOT NULL,
  "state" "arena_round_state" DEFAULT 'waiting_for_players' NOT NULL,
  "quickfire_question_id" uuid,
  "typerush_challenge_id" uuid,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "winner_account_id" uuid,
  "winner_response_id" uuid,
  "unique_responder_count" integer,
  "disqualify_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "arena_rounds"
  ADD CONSTRAINT "arena_rounds_arena_id_arenas_id_fk"
  FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "arena_rounds"
  ADD CONSTRAINT "arena_rounds_quickfire_question_id_fk"
  FOREIGN KEY ("quickfire_question_id") REFERENCES "public"."arena_quickfire_questions"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "arena_rounds"
  ADD CONSTRAINT "arena_rounds_typerush_challenge_id_fk"
  FOREIGN KEY ("typerush_challenge_id") REFERENCES "public"."arena_typerush_challenges"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "arena_rounds"
  ADD CONSTRAINT "arena_rounds_winner_account_id_fk"
  FOREIGN KEY ("winner_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "arena_rounds_arena_round_uidx" ON "arena_rounds" USING btree ("arena_id", "round_number");

CREATE INDEX "arena_rounds_arena_state_idx" ON "arena_rounds" USING btree ("arena_id", "state");

CREATE TABLE "arena_presence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "arena_id" uuid NOT NULL,
  "participant_account_id" uuid NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "arena_presence"
  ADD CONSTRAINT "arena_presence_arena_id_arenas_id_fk"
  FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "arena_presence"
  ADD CONSTRAINT "arena_presence_participant_account_id_fk"
  FOREIGN KEY ("participant_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "arena_presence_arena_account_uidx" ON "arena_presence" USING btree ("arena_id", "participant_account_id");

CREATE INDEX "arena_presence_arena_seen_idx" ON "arena_presence" USING btree ("arena_id", "last_seen_at" DESC);

CREATE TABLE "arena_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "round_id" uuid NOT NULL,
  "participant_account_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "payload" text NOT NULL,
  "is_correct" boolean NOT NULL,
  "ledger_entry_id" uuid NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "arena_responses"
  ADD CONSTRAINT "arena_responses_round_id_arena_rounds_id_fk"
  FOREIGN KEY ("round_id") REFERENCES "public"."arena_rounds"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "arena_responses"
  ADD CONSTRAINT "arena_responses_participant_account_id_fk"
  FOREIGN KEY ("participant_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "arena_responses"
  ADD CONSTRAINT "arena_responses_ledger_entry_id_fk"
  FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."kk_wallet_ledger"("id") ON DELETE restrict ON UPDATE no action;

CREATE INDEX "arena_responses_round_received_idx" ON "arena_responses" USING btree ("round_id", "received_at");

CREATE INDEX "arena_responses_round_account_idx" ON "arena_responses" USING btree ("round_id", "participant_account_id");

CREATE TABLE "arena_winners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "round_id" uuid NOT NULL,
  "participant_account_id" uuid NOT NULL,
  "response_id" uuid NOT NULL,
  "prize_milli" bigint NOT NULL,
  "prize_ledger_entry_id" uuid NOT NULL,
  "win_streak" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "arena_winners"
  ADD CONSTRAINT "arena_winners_round_id_unique" UNIQUE ("round_id");

ALTER TABLE "arena_winners"
  ADD CONSTRAINT "arena_winners_response_id_unique" UNIQUE ("response_id");

ALTER TABLE "arena_winners"
  ADD CONSTRAINT "arena_winners_round_id_arena_rounds_id_fk"
  FOREIGN KEY ("round_id") REFERENCES "public"."arena_rounds"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE "arena_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "arena_id" uuid NOT NULL,
  "round_id" uuid,
  "kind" "arena_activity_kind" NOT NULL,
  "message" text NOT NULL,
  "participant_account_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "arena_activity"
  ADD CONSTRAINT "arena_activity_arena_id_arenas_id_fk"
  FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "arena_activity_arena_created_idx" ON "arena_activity" USING btree ("arena_id", "created_at" DESC);

INSERT INTO "arenas" ("slug", "name", "kind", "description", "enabled")
VALUES
  (
    'quickfire',
    'KIRAKITAH QUICKFIRE',
    'quickfire',
    'Think fast. Answer faster. General knowledge fastest-finger competition.',
    false
  ),
  (
    'typerush',
    'KIRAKITAH TYPERUSH',
    'typerush',
    'See it. Type it. Beat everyone. Fastest-finger typing competition.',
    false
  );

ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ARENA_ROUND_RESOLVED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ARENA_WALLET_ADJUSTMENT';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ARENA_CONFIG_CHANGED';

INSERT INTO "arena_quickfire_questions" (
  "question", "option_a", "option_b", "option_c", "option_d", "correct_option", "category", "difficulty"
) VALUES (
  'Which planet is known as the Red Planet?',
  'Venus',
  'Mars',
  'Jupiter',
  'Mercury',
  'B',
  'Science',
  'easy'
);

INSERT INTO "arena_typerush_challenges" (
  "challenge_text", "normalized_text", "category", "difficulty"
) VALUES (
  'Success is built one disciplined decision at a time.',
  'Success is built one disciplined decision at a time.',
  'Motivation',
  'medium'
);
