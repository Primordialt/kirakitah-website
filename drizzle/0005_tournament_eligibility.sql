CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'registration_open', 'registration_closed', 'qualification', 'knockout', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tournament_participant_status" AS ENUM('selected', 'withdrawn', 'disqualified');--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"game" text NOT NULL,
	"edition" text NOT NULL,
	"description" text,
	"format" text,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"registration_start" timestamp with time zone,
	"registration_deadline" timestamp with time zone,
	"commencement_date" date,
	"target_participant_count" integer,
	"qualification_target" integer,
	"prize_info" text,
	"eligibility_rules_version" text NOT NULL,
	"eligibility_rules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "eligibility_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"participant_id" uuid,
	"rules_version" text NOT NULL,
	"eligible" boolean NOT NULL,
	"reason_codes" jsonb NOT NULL,
	"evaluated_requirements" jsonb NOT NULL,
	"evaluator_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "tournament_participant_status" DEFAULT 'selected' NOT NULL,
	"eligibility_evaluation_id" uuid NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"disqualified_at" timestamp with time zone,
	"disqualification_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_participants_tournament_application_unique" UNIQUE("tournament_id","application_id")
);
--> statement-breakpoint
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_application_id_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."registration_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_application_id_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."registration_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_eligibility_evaluation_id_eligibility_evaluations_id_fk" FOREIGN KEY ("eligibility_evaluation_id") REFERENCES "public"."eligibility_evaluations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_participant_id_tournament_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tournament_participants_tournament_status_idx" ON "tournament_participants" ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "eligibility_evaluations_tournament_application_idx" ON "eligibility_evaluations" ("tournament_id","application_id","created_at");--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ELIGIBILITY_EVALUATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'PARTICIPANT_SELECTED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'PARTICIPANT_WITHDRAWN';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'PARTICIPANT_DISQUALIFIED';--> statement-breakpoint
INSERT INTO "tournaments" (
	"id",
	"slug",
	"name",
	"game",
	"edition",
	"description",
	"format",
	"status",
	"commencement_date",
	"target_participant_count",
	"qualification_target",
	"prize_info",
	"eligibility_rules_version",
	"eligibility_rules"
) VALUES (
	'event-kg926',
	'kirakitah-gaming-926',
	'KIRAKITAH GAMING 926',
	'eFootball Mobile',
	'926',
	'The inaugural KIRAKITAH eFootball Mobile competition — an online 1v1 championship.',
	'Online 1v1',
	'registration_open',
	'2026-09-14',
	128,
	32,
	'US$100 Grand Prize',
	'kg926-v1',
	'{"minimumAge":10,"emailVerificationRequired":false,"phoneVerificationRequired":false,"applicationApprovedRequired":true,"approvedApplicationStatus":"verified","identityVerifiedRequired":true,"requireGuardianForMinors":true}'::jsonb
) ON CONFLICT ("id") DO NOTHING;
