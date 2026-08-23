CREATE TYPE "public"."admin_role" AS ENUM('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'REVIEWER', 'SUPPORT');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "admin_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "admin_users_role_active_idx" ON "admin_users" ("role","active");--> statement-breakpoint
CREATE TYPE "public"."admin_audit_event_type" AS ENUM('ADMIN_LOGIN', 'IDENTITY_REVIEW_APPROVED', 'IDENTITY_REVIEW_REJECTED', 'APPLICATION_STATUS_CHANGED', 'SENSITIVE_IDENTITY_VIEWED', 'GUARDIAN_DATA_VIEWED', 'PLAYER_PHOTO_VIEWED');--> statement-breakpoint
CREATE TABLE "admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "admin_audit_event_type" NOT NULL,
	"actor_id" text,
	"actor_role" "admin_role",
	"application_id" uuid,
	"application_reference" text,
	"request_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "admin_audit_events" ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_application_idx" ON "admin_audit_events" ("application_reference","created_at");--> statement-breakpoint
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_application_id_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."registration_applications"("id") ON DELETE set null ON UPDATE no action;
