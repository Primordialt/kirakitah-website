-- KG926 eligibility v4: add YouTube subscription as a required social platform.
UPDATE "tournaments"
SET
  "eligibility_rules_version" = 'kg926-v4',
  "eligibility_rules" = (
    COALESCE("eligibility_rules", '{}'::jsonb)
    || jsonb_build_object(
      'socialFollowingRequired', true,
      'requiredSocialPlatforms', '["x","instagram","tiktok","youtube"]'::jsonb
    )
  ),
  "updated_at" = now()
WHERE "id" = 'event-kg926';--> statement-breakpoint
-- Backfill pending YouTube rows for existing applications (not auto-verified).
INSERT INTO "registration_social_follows" (
  "application_id",
  "platform",
  "applicant_handle",
  "verification_status",
  "updated_at"
)
SELECT
  ra."id",
  'youtube',
  'Pending attestation',
  'pending',
  now()
FROM "registration_applications" ra
WHERE NOT EXISTS (
  SELECT 1
  FROM "registration_social_follows" rsf
  WHERE rsf."application_id" = ra."id"
    AND rsf."platform" = 'youtube'
);--> statement-breakpoint
-- Applications previously marked fully verified must re-evaluate with YouTube pending.
UPDATE "registration_applications" ra
SET
  "social_follow_status" = 'pending_review',
  "updated_at" = now()
WHERE ra."social_follow_status" = 'verified'
  AND EXISTS (
    SELECT 1
    FROM "registration_social_follows" rsf
    WHERE rsf."application_id" = ra."id"
      AND rsf."platform" = 'youtube'
      AND rsf."verification_status" <> 'verified'
  );
