CREATE TABLE "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "push_subscriptions_account_id_participant_accounts_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."participant_accounts"("id")
    ON DELETE cascade ON UPDATE no action
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_uidx" ON "push_subscriptions" ("endpoint");
CREATE INDEX "push_subscriptions_account_idx" ON "push_subscriptions" ("account_id");
