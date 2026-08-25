-- Admin user management audit events + updated_at for role/active changes.
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_CREATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_ROLE_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_ACTIVATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_DEACTIVATED';--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
