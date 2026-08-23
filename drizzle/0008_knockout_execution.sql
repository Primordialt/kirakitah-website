-- Backend Step 9: KG926 knockout execution — Top 32 bracket, manual pairing, champion

ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_PAIRINGS_CONFIGURED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_PAIRINGS_REVISED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_BRACKET_GENERATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_MATCH_CREATED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_RESULT_RECORDED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_MATCH_RESOLVED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_RESULT_CORRECTED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_MATCH_DISPUTED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_FORFEIT_RECORDED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'KNOCKOUT_ROUND_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'TOURNAMENT_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_event_type" ADD VALUE IF NOT EXISTS 'CHAMPION_RECORDED';--> statement-breakpoint

CREATE TYPE "public"."knockout_pairing_set_status" AS ENUM('draft', 'confirmed', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."knockout_bracket_status" AS ENUM('not_generated', 'generated', 'active', 'completed');--> statement-breakpoint

ALTER TABLE "tournaments" ADD COLUMN "champion_participant_id" uuid;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "knockout_bracket_status" "knockout_bracket_status" DEFAULT 'not_generated' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_champion_participant_id_tournament_participants_id_fk"
    FOREIGN KEY ("champion_participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "matches" ADD COLUMN "bracket_slot_index" integer;--> statement-breakpoint

CREATE TABLE "knockout_pairing_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" text NOT NULL,
	"phase_id" uuid NOT NULL,
	"status" "knockout_pairing_set_status" DEFAULT 'draft' NOT NULL,
	"rules_version" text DEFAULT 'kg926-v1' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text,
	"change_reason" text,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "knockout_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pairing_set_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"participant_a_id" uuid NOT NULL,
	"participant_b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knockout_pairings_slot_check" CHECK ("slot_index" >= 1 AND "slot_index" <= 16),
	CONSTRAINT "knockout_pairings_no_self_match" CHECK ("participant_a_id" <> "participant_b_id"),
	CONSTRAINT "knockout_pairings_set_slot_unique" UNIQUE("pairing_set_id","slot_index")
);--> statement-breakpoint

CREATE TABLE "knockout_pairing_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pairing_set_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"side" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knockout_pairing_participants_side_check" CHECK ("side" IN ('a', 'b')),
	CONSTRAINT "knockout_pairing_participants_set_participant_unique" UNIQUE("pairing_set_id","participant_id"),
	CONSTRAINT "knockout_pairing_participants_set_slot_side_unique" UNIQUE("pairing_set_id","slot_index","side")
);--> statement-breakpoint

ALTER TABLE "knockout_pairing_sets" ADD CONSTRAINT "knockout_pairing_sets_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_pairing_sets" ADD CONSTRAINT "knockout_pairing_sets_phase_id_tournament_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."tournament_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_pairings" ADD CONSTRAINT "knockout_pairings_pairing_set_id_knockout_pairing_sets_id_fk" FOREIGN KEY ("pairing_set_id") REFERENCES "public"."knockout_pairing_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_pairings" ADD CONSTRAINT "knockout_pairings_participant_a_id_tournament_participants_id_fk" FOREIGN KEY ("participant_a_id") REFERENCES "public"."tournament_participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_pairings" ADD CONSTRAINT "knockout_pairings_participant_b_id_tournament_participants_id_fk" FOREIGN KEY ("participant_b_id") REFERENCES "public"."tournament_participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_pairing_participants" ADD CONSTRAINT "knockout_pairing_participants_pairing_set_id_fk" FOREIGN KEY ("pairing_set_id") REFERENCES "public"."knockout_pairing_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_pairing_participants" ADD CONSTRAINT "knockout_pairing_participants_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "knockout_pairing_sets_one_confirmed_per_tournament" ON "knockout_pairing_sets" ("tournament_id") WHERE "status" = 'confirmed';--> statement-breakpoint
CREATE INDEX "knockout_pairing_sets_tournament_status_idx" ON "knockout_pairing_sets" ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "matches_knockout_round_slot_idx" ON "matches" ("knockout_round_id","bracket_slot_index");--> statement-breakpoint

-- Finalize competition rules: knockout pairing strategy is manual (not invented seeding)
UPDATE "tournaments"
SET "competition_rules" = jsonb_set(
  COALESCE("competition_rules", '{}'::jsonb),
  '{knockout}',
  COALESCE("competition_rules"->'knockout', '{}'::jsonb) || jsonb_build_object(
    'format', 'single_elimination',
    'pairing', 'manual',
    'seeding', 'pending',
    'scheduling', 'manual',
    'tieResolution', 'pending',
    'entrantCount', 32,
    'rounds', jsonb_build_array('round_of_32','round_of_16','quarterfinal','semifinal','grand_final')
  ),
  true
)
WHERE "id" = 'event-kg926';
