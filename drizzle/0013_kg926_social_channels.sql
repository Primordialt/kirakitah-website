-- Add X to social_platform enum (YouTube retained for future optional support).
ALTER TYPE "public"."social_platform" ADD VALUE IF NOT EXISTS 'x';--> statement-breakpoint
-- Eligibility policy correction: required platforms are X + Instagram + TikTok.
UPDATE "tournaments"
SET
  "eligibility_rules_version" = 'kg926-v3',
  "eligibility_rules" = (
    COALESCE("eligibility_rules", '{}'::jsonb)
    || jsonb_build_object(
      'socialFollowingRequired', true,
      'requiredSocialPlatforms', '["x","instagram","tiktok"]'::jsonb
    )
  ),
  "updated_at" = now()
WHERE "id" = 'event-kg926';
