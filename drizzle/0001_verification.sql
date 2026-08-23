CREATE TYPE "public"."identity_verification_status" AS ENUM('verified', 'manual_review', 'mismatch', 'not_found', 'provider_unavailable');--> statement-breakpoint
CREATE TYPE "public"."contact_verification_status" AS ENUM('pending', 'verified', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."verification_challenge_channel" AS ENUM('email', 'phone');--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "identity_verification_status" "identity_verification_status" DEFAULT 'provider_unavailable' NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "identity_verification_meta" jsonb;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "email_verification_status" "contact_verification_status" DEFAULT 'skipped' NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD COLUMN "phone_verification_status" "contact_verification_status" DEFAULT 'skipped' NOT NULL;--> statement-breakpoint
CREATE TABLE "registration_verification_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"channel" "verification_challenge_channel" NOT NULL,
	"destination_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration_verification_challenges" ADD CONSTRAINT "registration_verification_challenges_application_id_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."registration_applications"("id") ON DELETE cascade ON UPDATE no action;
