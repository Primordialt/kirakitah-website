CREATE TYPE "public"."identity_verification_status_new" AS ENUM('pending_review', 'verified', 'manual_review', 'rejected', 'mismatch', 'not_found', 'provider_unavailable');--> statement-breakpoint
ALTER TABLE "registration_applications" ALTER COLUMN "identity_verification_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "registration_applications" ALTER COLUMN "identity_verification_status" TYPE "public"."identity_verification_status_new" USING (
  CASE
    WHEN "identity_verification_status"::text = 'manual_review' THEN 'pending_review'::"public"."identity_verification_status_new"
    ELSE "identity_verification_status"::text::"public"."identity_verification_status_new"
  END
);--> statement-breakpoint
DROP TYPE "public"."identity_verification_status";--> statement-breakpoint
ALTER TYPE "public"."identity_verification_status_new" RENAME TO "identity_verification_status";--> statement-breakpoint
ALTER TABLE "registration_applications" ALTER COLUMN "identity_verification_status" SET DEFAULT 'pending_review';
