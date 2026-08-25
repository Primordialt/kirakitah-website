CREATE TYPE "public"."social_platform" AS ENUM('instagram', 'tiktok', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."social_platform_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."social_follow_status" AS ENUM('pending_review', 'verified', 'rejected');--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN IF NOT EXISTS "social_follow_status" "social_follow_status" DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN IF NOT EXISTS "social_follow_attestation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN IF NOT EXISTS "social_follow_attestation_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_social_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"applicant_handle" text NOT NULL,
	"verification_status" "social_platform_verification_status" DEFAULT 'pending' NOT NULL,
	"verification_notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_social_follows" ADD CONSTRAINT "registration_social_follows_application_id_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."registration_applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "registration_social_follows_application_platform_uidx" ON "registration_social_follows" ("application_id","platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registration_social_follows_status_idx" ON "registration_social_follows" ("verification_status","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registration_applications_social_follow_status_idx" ON "registration_applications" ("social_follow_status");--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'SOCIAL_FOLLOW_REVIEWED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'SOCIAL_FOLLOW_APPROVED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'SOCIAL_FOLLOW_REJECTED';--> statement-breakpoint
UPDATE "tournaments"
SET
  "eligibility_rules_version" = 'kg926-v2',
  "eligibility_rules" = jsonb_set(
    COALESCE("eligibility_rules", '{}'::jsonb),
    '{socialFollowingRequired}',
    'true'::jsonb,
    true
  ),
  "updated_at" = now()
WHERE "id" = 'event-kg926';--> statement-breakpoint
UPDATE "registration_applications"
SET "social_follow_status" = 'pending_review'
WHERE "social_follow_status" IS NULL OR "social_follow_status" = 'pending_review';
