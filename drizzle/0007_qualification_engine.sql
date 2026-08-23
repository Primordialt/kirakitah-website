-- Backend Step 8: KG926 qualification engine — 32 pods, single elimination, host rule

CREATE TYPE "public"."qualification_pod_status" AS ENUM('draft', 'ready', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."qualification_round_type" AS ENUM('semifinal', 'final');--> statement-breakpoint
CREATE TYPE "public"."competitor_slot_type" AS ENUM('participant', 'host', 'match_winner');--> statement-breakpoint
CREATE TYPE "public"."qualification_outcome_type" AS ENUM('played', 'auto_advance', 'requires_resolution');--> statement-breakpoint

ALTER TYPE "public"."match_status" ADD VALUE IF NOT EXISTS 'requires_resolution';--> statement-breakpoint

CREATE TABLE "qualification_pods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" text NOT NULL,
	"phase_id" uuid NOT NULL,
	"pod_number" integer NOT NULL,
	"status" "qualification_pod_status" DEFAULT 'draft' NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"host_semifinal_index" integer,
	"qualifier_participant_id" uuid,
	"rules_version" text DEFAULT 'kg926-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_pods_tournament_pod_number_unique" UNIQUE("tournament_id","pod_number"),
	CONSTRAINT "qualification_pods_host_semifinal_check" CHECK ("host_semifinal_index" IS NULL OR "host_semifinal_index" IN (1, 2))
);--> statement-breakpoint

CREATE TABLE "qualification_pod_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pod_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"position_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_pod_members_pod_position_unique" UNIQUE("pod_id","position_number"),
	CONSTRAINT "qualification_pod_members_pod_participant_unique" UNIQUE("pod_id","participant_id"),
	CONSTRAINT "qualification_pod_members_phase_participant_unique" UNIQUE("phase_id","participant_id"),
	CONSTRAINT "qualification_pod_members_position_check" CHECK ("position_number" >= 1 AND "position_number" <= 4)
);--> statement-breakpoint

CREATE TABLE "qualification_auto_advancements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pod_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"semifinal_index" integer NOT NULL,
	"reason" text DEFAULT 'HOST_POSITION' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_auto_advancements_pod_participant_unique" UNIQUE("pod_id","participant_id")
);--> statement-breakpoint

ALTER TABLE "matches" ALTER COLUMN "participant_a_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "participant_b_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT IF EXISTS "matches_participants_distinct";--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_participants_distinct" CHECK (
	"participant_a_id" IS NULL OR "participant_b_id" IS NULL OR "participant_a_id" <> "participant_b_id"
);--> statement-breakpoint

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "qualification_pod_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "qualification_round" "qualification_round_type";--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "semifinal_index" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "slot_a_type" "competitor_slot_type" DEFAULT 'participant';--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "slot_b_type" "competitor_slot_type" DEFAULT 'participant';--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "depends_on_match_a_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "depends_on_match_b_id" uuid;--> statement-breakpoint

ALTER TABLE "match_results" ADD COLUMN IF NOT EXISTS "outcome_type" "qualification_outcome_type" DEFAULT 'played';--> statement-breakpoint

ALTER TABLE "qualification_pods" ADD CONSTRAINT "qualification_pods_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "qualification_pods" ADD CONSTRAINT "qualification_pods_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "qualification_pods" ADD CONSTRAINT "qualification_pods_qualifier_participant_id_fk" FOREIGN KEY ("qualifier_participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "qualification_pod_members" ADD CONSTRAINT "qualification_pod_members_pod_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."qualification_pods"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "qualification_pod_members" ADD CONSTRAINT "qualification_pod_members_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "qualification_pod_members" ADD CONSTRAINT "qualification_pod_members_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "qualification_auto_advancements" ADD CONSTRAINT "qualification_auto_advancements_pod_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."qualification_pods"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "qualification_auto_advancements" ADD CONSTRAINT "qualification_auto_advancements_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "qualification_auto_advancements" ADD CONSTRAINT "qualification_auto_advancements_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_qualification_pod_id_fk" FOREIGN KEY ("qualification_pod_id") REFERENCES "public"."qualification_pods"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_depends_on_match_a_id_fk" FOREIGN KEY ("depends_on_match_a_id") REFERENCES "public"."matches"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_depends_on_match_b_id_fk" FOREIGN KEY ("depends_on_match_b_id") REFERENCES "public"."matches"("id") ON DELETE set null;--> statement-breakpoint

CREATE INDEX "qualification_pods_phase_status_idx" ON "qualification_pods" ("phase_id","status");--> statement-breakpoint
CREATE INDEX "qualification_pod_members_pod_idx" ON "qualification_pod_members" ("pod_id");--> statement-breakpoint
CREATE INDEX "matches_qualification_pod_idx" ON "matches" ("qualification_pod_id","qualification_round");--> statement-breakpoint

ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_POD_CREATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_PARTICIPANT_ASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_PARTICIPANT_REASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_MATCH_CREATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_MATCH_RESOLVED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_AUTO_ADVANCED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_POD_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_TOP32_ADVANCED';--> statement-breakpoint

UPDATE "tournaments"
SET "competition_rules" = '{
  "rulesVersion": "kg926-v1",
  "qualification": {
    "format": "single_elimination_pods",
    "podCount": 32,
    "positionsPerPod": 4,
    "qualifiersPerPod": 1,
    "maxMatchesPerNormalPod": 3,
    "maxQualificationMatches": 96,
    "targetEntrants": 128,
    "qualificationTarget": 32,
    "assignmentMode": "manual",
    "hostRule": {
      "enabled": true,
      "autoAdvanceAgainstHost": true,
      "hostIsNotParticipant": true
    },
    "tieResolution": "pending"
  },
  "knockout": {
    "seeding": "pending",
    "pairing": "pending",
    "rounds": ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "grand_final"]
  }
}'::jsonb
WHERE "id" = 'event-kg926';--> statement-breakpoint

INSERT INTO "qualification_pods" ("tournament_id", "phase_id", "pod_number", "status", "capacity", "rules_version")
SELECT 'event-kg926', p.id, gs.n, 'draft', 4, 'kg926-v1'
FROM "tournament_phases" p
CROSS JOIN generate_series(1, 32) AS gs(n)
WHERE p.tournament_id = 'event-kg926' AND p.slug = 'qualification'
ON CONFLICT ("tournament_id", "pod_number") DO NOTHING;
