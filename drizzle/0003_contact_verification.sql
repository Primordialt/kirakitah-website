ALTER TABLE "registration_applications" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "identity_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "identity_reviewed_by" text;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "identity_review_notes" text;--> statement-breakpoint
ALTER TYPE "public"."contact_verification_status" ADD VALUE IF NOT EXISTS 'unavailable';--> statement-breakpoint
ALTER TABLE "registration_verification_challenges" ADD COLUMN "max_attempts" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_verification_challenges" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "verification_challenge_app_channel_created_idx" ON "registration_verification_challenges" ("application_id","channel","created_at");--> statement-breakpoint
CREATE INDEX "verification_challenge_active_expires_idx" ON "registration_verification_challenges" ("expires_at") WHERE "verified_at" IS NULL AND "superseded_at" IS NULL;--> statement-breakpoint
CREATE TYPE "public"."registration_audit_event_type" AS ENUM('EMAIL_VERIFIED', 'PHONE_VERIFIED', 'IDENTITY_REVIEW_APPROVED', 'IDENTITY_REVIEW_REJECTED', 'APPLICATION_STATUS_CHANGED');--> statement-breakpoint
CREATE TABLE "registration_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"event_type" "registration_audit_event_type" NOT NULL,
	"actor" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration_audit_events" ADD CONSTRAINT "registration_audit_events_application_id_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."registration_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registration_audit_application_created_idx" ON "registration_audit_events" ("application_id","created_at");
