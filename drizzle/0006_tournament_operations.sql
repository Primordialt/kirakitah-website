-- Backend Step 7: Tournament competition operations foundation
-- Does NOT invent qualification scoring, pairing, or bracket generation mechanics.

CREATE TYPE "public"."tournament_phase_type" AS ENUM('qualification', 'knockout', 'final');--> statement-breakpoint
CREATE TYPE "public"."tournament_phase_status" AS ENUM('draft', 'scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."phase_participant_status" AS ENUM('active', 'qualified', 'eliminated', 'withdrawn', 'disqualified');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'ready', 'live', 'completed', 'cancelled', 'disputed', 'forfeited');--> statement-breakpoint
CREATE TYPE "public"."match_result_source" AS ENUM('admin', 'player_report', 'integration');--> statement-breakpoint
CREATE TYPE "public"."knockout_round_type" AS ENUM('round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'grand_final');--> statement-breakpoint
CREATE TYPE "public"."knockout_round_status" AS ENUM('draft', 'scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint

ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "competition_rules" jsonb;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "public_code" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_participants_public_code_unique" ON "tournament_participants" ("public_code") WHERE "public_code" IS NOT NULL;--> statement-breakpoint

UPDATE "tournaments"
SET "competition_rules" = '{
  "rulesVersion": "kg926-v1",
  "qualification": {
    "scoring": "pending",
    "ranking": "pending",
    "tiebreakers": "pending",
    "pairing": "pending",
    "advancement": "pending",
    "targetEntrants": 128,
    "qualificationTarget": 32
  },
  "knockout": {
    "seeding": "pending",
    "pairing": "pending",
    "rounds": ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "grand_final"]
  }
}'::jsonb
WHERE "id" = 'event-kg926' AND ("competition_rules" IS NULL);--> statement-breakpoint

CREATE TABLE "tournament_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"phase_type" "tournament_phase_type" NOT NULL,
	"sequence" integer NOT NULL,
	"status" "tournament_phase_status" DEFAULT 'draft' NOT NULL,
	"participant_limit" integer,
	"qualification_target" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"rules_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_phases_tournament_slug_unique" UNIQUE("tournament_id","slug"),
	CONSTRAINT "tournament_phases_tournament_sequence_unique" UNIQUE("tournament_id","sequence")
);--> statement-breakpoint

CREATE TABLE "tournament_phase_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"status" "phase_participant_status" DEFAULT 'active' NOT NULL,
	"seed" integer,
	"rank" integer,
	"qualification_position" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_phase_participants_phase_participant_unique" UNIQUE("phase_id","participant_id")
);--> statement-breakpoint

CREATE TABLE "knockout_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"name" text NOT NULL,
	"round_type" "knockout_round_type" NOT NULL,
	"sequence" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"status" "knockout_round_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knockout_rounds_phase_type_unique" UNIQUE("phase_id","round_type"),
	CONSTRAINT "knockout_rounds_phase_sequence_unique" UNIQUE("phase_id","sequence")
);--> statement-breakpoint

CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" text NOT NULL,
	"phase_id" uuid NOT NULL,
	"knockout_round_id" uuid,
	"participant_a_id" uuid NOT NULL,
	"participant_b_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"authoritative_result_id" uuid,
	"rules_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_participants_distinct" CHECK ("participant_a_id" <> "participant_b_id")
);--> statement-breakpoint

CREATE TABLE "match_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"participant_a_score" integer NOT NULL,
	"participant_b_score" integer NOT NULL,
	"winner_participant_id" uuid,
	"is_draw" boolean DEFAULT false NOT NULL,
	"is_authoritative" boolean DEFAULT true NOT NULL,
	"result_source" "match_result_source" DEFAULT 'admin' NOT NULL,
	"recorded_by" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_by_result_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_results_scores_non_negative" CHECK ("participant_a_score" >= 0 AND "participant_b_score" >= 0)
);--> statement-breakpoint

CREATE TABLE "match_result_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"original_result_id" uuid NOT NULL,
	"corrected_result_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "qualification_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"goal_difference" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"rebuilt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_standings_phase_participant_unique" UNIQUE("phase_id","participant_id"),
	CONSTRAINT "qualification_standings_non_negative" CHECK (
		"played" >= 0 AND "wins" >= 0 AND "draws" >= 0 AND "losses" >= 0 AND
		"points" >= 0 AND "goals_for" >= 0 AND "goals_against" >= 0
	)
);--> statement-breakpoint

ALTER TABLE "tournament_phases" ADD CONSTRAINT "tournament_phases_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_phase_participants" ADD CONSTRAINT "tournament_phase_participants_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_phase_participants" ADD CONSTRAINT "tournament_phase_participants_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_rounds" ADD CONSTRAINT "knockout_rounds_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_knockout_round_id_fk" FOREIGN KEY ("knockout_round_id") REFERENCES "public"."knockout_rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_participant_a_id_fk" FOREIGN KEY ("participant_a_id") REFERENCES "public"."tournament_participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_participant_b_id_fk" FOREIGN KEY ("participant_b_id") REFERENCES "public"."tournament_participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_winner_participant_id_fk" FOREIGN KEY ("winner_participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_superseded_by_fk" FOREIGN KEY ("superseded_by_result_id") REFERENCES "public"."match_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_authoritative_result_id_fk" FOREIGN KEY ("authoritative_result_id") REFERENCES "public"."match_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result_corrections" ADD CONSTRAINT "match_result_corrections_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result_corrections" ADD CONSTRAINT "match_result_corrections_original_result_id_fk" FOREIGN KEY ("original_result_id") REFERENCES "public"."match_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result_corrections" ADD CONSTRAINT "match_result_corrections_corrected_result_id_fk" FOREIGN KEY ("corrected_result_id") REFERENCES "public"."match_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_standings" ADD CONSTRAINT "qualification_standings_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_standings" ADD CONSTRAINT "qualification_standings_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "tournament_phases_tournament_status_idx" ON "tournament_phases" ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "tournament_phase_participants_phase_status_idx" ON "tournament_phase_participants" ("phase_id","status");--> statement-breakpoint
CREATE INDEX "matches_tournament_phase_status_idx" ON "matches" ("tournament_id","phase_id","status");--> statement-breakpoint
CREATE INDEX "match_results_match_authoritative_idx" ON "match_results" ("match_id","is_authoritative");--> statement-breakpoint
CREATE INDEX "qualification_standings_phase_rank_idx" ON "qualification_standings" ("phase_id","rank");--> statement-breakpoint

ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'PHASE_CREATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'PHASE_STARTED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'PHASE_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_CREATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_SCHEDULED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_RESULT_RECORDED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_RESULT_CORRECTED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_DISPUTED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_FORFEITED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFIER_ADVANCED';--> statement-breakpoint

-- Seed KG926 phase structure (structure only — mechanics remain PENDING PRODUCT DECISION)
INSERT INTO "tournament_phases" (
	"tournament_id", "name", "slug", "phase_type", "sequence", "status",
	"participant_limit", "qualification_target", "rules_version"
) VALUES
	('event-kg926', 'Qualification', 'qualification', 'qualification', 1, 'draft', 128, 32, 'kg926-v1'),
	('event-kg926', 'Knockout', 'knockout', 'knockout', 2, 'draft', 32, NULL, 'kg926-v1'),
	('event-kg926', 'Grand Final', 'grand-final', 'final', 3, 'draft', 2, NULL, 'kg926-v1')
ON CONFLICT ("tournament_id", "slug") DO NOTHING;--> statement-breakpoint

INSERT INTO "knockout_rounds" ("phase_id", "name", "round_type", "sequence", "participant_count", "status")
SELECT p.id, r.name, r.round_type::"knockout_round_type", r.sequence, r.participant_count, 'draft'::"knockout_round_status"
FROM "tournament_phases" p
CROSS JOIN (VALUES
	('Round of 32', 'round_of_32', 1, 32),
	('Round of 16', 'round_of_16', 2, 16),
	('Quarterfinal', 'quarterfinal', 3, 8),
	('Semifinal', 'semifinal', 4, 4),
	('Grand Final', 'grand_final', 5, 2)
) AS r(name, round_type, sequence, participant_count)
WHERE p.tournament_id = 'event-kg926' AND p.slug = 'knockout'
ON CONFLICT ("phase_id", "round_type") DO NOTHING;
