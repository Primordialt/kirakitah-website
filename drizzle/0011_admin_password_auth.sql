ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "password_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_login_attempts_key_created_idx" ON "admin_login_attempts" ("attempt_key","created_at");--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_LOGIN_SUCCESS';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_LOGIN_FAILURE';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_LOGOUT';
