ALTER TABLE "arena_rounds" ADD COLUMN IF NOT EXISTS "accepted_response_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "arena_rounds" ADD COLUMN IF NOT EXISTS "candidate_winner_response_id" uuid;
ALTER TABLE "arena_rounds" ADD COLUMN IF NOT EXISTS "total_kk_collected_milli" bigint DEFAULT 0 NOT NULL;

-- Prize is 3 KK (3000 milli). Column historically defaulted to 6000.
ALTER TABLE "arenas" ALTER COLUMN "prize_milli" SET DEFAULT 3000;
UPDATE "arenas" SET "prize_milli" = 3000 WHERE "prize_milli" = 6000;
