CREATE TYPE "public"."identification_type" AS ENUM('nin', 'passport');--> statement-breakpoint
CREATE TYPE "public"."registration_application_status" AS ENUM('received', 'under_review', 'verified', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TABLE "registration_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" text NOT NULL,
	"event_id" text NOT NULL,
	"status" "registration_application_status" DEFAULT 'received' NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"identification_type" "identification_type" NOT NULL,
	"identification_number_hash" text NOT NULL,
	"identification_number_encrypted" text NOT NULL,
	"gamer_tag" text NOT NULL,
	"game" text NOT NULL,
	"platform" text NOT NULL,
	"gaming_profile" text,
	"timezone" text NOT NULL,
	"availability" jsonb NOT NULL,
	"social_handles" jsonb,
	"player_photo_blob_key" text NOT NULL,
	"player_photo_meta" jsonb NOT NULL,
	"consents" jsonb NOT NULL,
	"submit_ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_applications_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "registration_guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"relationship" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration_guardians" ADD CONSTRAINT "registration_guardians_application_id_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."registration_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registration_event_email_active_idx" ON "registration_applications" USING btree ("event_id",lower("email")) WHERE "registration_applications"."status" NOT IN ('rejected', 'withdrawn');--> statement-breakpoint
CREATE UNIQUE INDEX "registration_event_id_hash_active_idx" ON "registration_applications" USING btree ("event_id","identification_type","identification_number_hash") WHERE "registration_applications"."status" NOT IN ('rejected', 'withdrawn');
