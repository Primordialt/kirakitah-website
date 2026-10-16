ALTER TABLE "kk_wallets"
  ADD COLUMN "reserved_milli" bigint DEFAULT 0 NOT NULL;

ALTER TABLE "kk_wallets"
  ADD CONSTRAINT "kk_wallets_reserved_nonneg" CHECK ("reserved_milli" >= 0);

ALTER TABLE "kk_wallets"
  ADD CONSTRAINT "kk_wallets_reserved_lte_balance" CHECK ("reserved_milli" <= "balance_milli");

ALTER TABLE "kk_wallet_deposits"
  ADD COLUMN "order_id" text,
  ADD COLUMN "provider_payment_id" text,
  ADD COLUMN "pay_currency" text,
  ADD COLUMN "pay_address" text,
  ADD COLUMN "price_amount_text" text,
  ADD COLUMN "pay_amount_text" text,
  ADD COLUMN "actually_paid_text" text,
  ADD COLUMN "outcome_amount_text" text,
  ADD COLUMN "outcome_currency" text,
  ADD COLUMN "provider_status" text,
  ADD COLUMN "provider_fee" jsonb,
  ADD COLUMN "review_reason" text,
  ADD COLUMN "credited_milli" bigint,
  ADD COLUMN "parent_payment_id" text,
  ADD COLUMN "network" text;

CREATE UNIQUE INDEX "kk_wallet_deposits_order_uidx"
  ON "kk_wallet_deposits" ("order_id")
  WHERE "order_id" IS NOT NULL;

CREATE UNIQUE INDEX "kk_wallet_deposits_provider_payment_uidx"
  ON "kk_wallet_deposits" ("provider_payment_id")
  WHERE "provider_payment_id" IS NOT NULL;

ALTER TABLE "kk_wallet_withdrawals"
  ADD COLUMN "review_state" text DEFAULT 'pending_review' NOT NULL,
  ADD COLUMN "destination_address" text,
  ADD COLUMN "network" text,
  ADD COLUMN "reserved_milli" bigint DEFAULT 0 NOT NULL,
  ADD COLUMN "idempotency_key" text,
  ADD COLUMN "provider_batch_id" text,
  ADD COLUMN "provider_payout_id" text,
  ADD COLUMN "provider_status" text,
  ADD COLUMN "provider_fee_text" text,
  ADD COLUMN "failure_reason" text;

CREATE UNIQUE INDEX "kk_wallet_withdrawals_idempotency_uidx"
  ON "kk_wallet_withdrawals" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE UNIQUE INDEX "kk_wallet_withdrawals_provider_payout_uidx"
  ON "kk_wallet_withdrawals" ("provider_payout_id")
  WHERE "provider_payout_id" IS NOT NULL;

CREATE TABLE "kk_payment_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "event_key" text NOT NULL,
  "provider_payment_id" text,
  "order_id" text,
  "provider_status" text,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone
);

CREATE UNIQUE INDEX "kk_payment_events_provider_key_uidx"
  ON "kk_payment_events" ("provider", "event_key");
