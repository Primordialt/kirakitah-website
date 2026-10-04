CREATE TYPE "public"."chat_room_type" AS ENUM(
  'community',
  'tournament',
  'pod',
  'match',
  'private'
);

CREATE TYPE "public"."chat_message_type" AS ENUM(
  'user',
  'announcement',
  'system'
);

CREATE TYPE "public"."chat_member_status" AS ENUM(
  'active',
  'muted',
  'restricted'
);

CREATE TABLE "chat_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "room_type" "chat_room_type" NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "pinned_message_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "chat_rooms_slug_uidx" ON "chat_rooms" USING btree ("slug");

CREATE TABLE "chat_room_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "participant_account_id" uuid NOT NULL,
  "status" "chat_member_status" DEFAULT 'active' NOT NULL,
  "status_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "chat_room_members"
  ADD CONSTRAINT "chat_room_members_room_id_chat_rooms_id_fk"
  FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "chat_room_members"
  ADD CONSTRAINT "chat_room_members_participant_account_id_participant_accounts_id_fk"
  FOREIGN KEY ("participant_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "chat_room_members_room_account_uidx" ON "chat_room_members" USING btree ("room_id", "participant_account_id");

CREATE INDEX "chat_room_members_account_idx" ON "chat_room_members" USING btree ("participant_account_id");

CREATE TABLE "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "sender_participant_account_id" uuid,
  "sender_admin_user_id" uuid,
  "content" text NOT NULL,
  "message_type" "chat_message_type" DEFAULT 'user' NOT NULL,
  "reply_to_message_id" uuid,
  "edited_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by_admin_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_room_id_chat_rooms_id_fk"
  FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_sender_participant_account_id_participant_accounts_id_fk"
  FOREIGN KEY ("sender_participant_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_sender_admin_user_id_admin_users_id_fk"
  FOREIGN KEY ("sender_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_deleted_by_admin_user_id_admin_users_id_fk"
  FOREIGN KEY ("deleted_by_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_reply_to_message_id_chat_messages_id_fk"
  FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "chat_messages_room_created_idx" ON "chat_messages" USING btree ("room_id", "created_at" DESC);

CREATE INDEX "chat_messages_sender_participant_idx" ON "chat_messages" USING btree ("sender_participant_account_id");

CREATE TABLE "chat_message_mentions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "mentioned_account_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "chat_message_mentions"
  ADD CONSTRAINT "chat_message_mentions_message_id_chat_messages_id_fk"
  FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "chat_message_mentions"
  ADD CONSTRAINT "chat_message_mentions_mentioned_account_id_participant_accounts_id_fk"
  FOREIGN KEY ("mentioned_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "chat_message_mentions_message_account_uidx" ON "chat_message_mentions" USING btree ("message_id", "mentioned_account_id");

CREATE INDEX "chat_message_mentions_account_idx" ON "chat_message_mentions" USING btree ("mentioned_account_id");

CREATE TABLE "chat_message_reads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "participant_account_id" uuid NOT NULL,
  "last_read_message_id" uuid,
  "last_read_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "chat_message_reads"
  ADD CONSTRAINT "chat_message_reads_room_id_chat_rooms_id_fk"
  FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "chat_message_reads"
  ADD CONSTRAINT "chat_message_reads_participant_account_id_participant_accounts_id_fk"
  FOREIGN KEY ("participant_account_id") REFERENCES "public"."participant_accounts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "chat_message_reads"
  ADD CONSTRAINT "chat_message_reads_last_read_message_id_chat_messages_id_fk"
  FOREIGN KEY ("last_read_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "chat_message_reads_room_account_uidx" ON "chat_message_reads" USING btree ("room_id", "participant_account_id");

ALTER TABLE "chat_rooms"
  ADD CONSTRAINT "chat_rooms_pinned_message_id_chat_messages_id_fk"
  FOREIGN KEY ("pinned_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;

INSERT INTO "chat_rooms" ("id", "slug", "name", "room_type", "is_locked")
VALUES (
  'c0mm0000-0000-4000-8000-000000000001',
  'kirakitah-community',
  'KIRAKITAH Community',
  'community',
  false
);

ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_LOCKED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_UNLOCKED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_DELETED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_PINNED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_UNPINNED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_MEMBER_RESTRICTED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_MEMBER_UNRESTRICTED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAT_ANNOUNCEMENT_CREATED';
