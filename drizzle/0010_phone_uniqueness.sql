-- Phone uniqueness for active KIRAKITAH GAMING 926 applications.
-- Digits-only normalization; original phone display value is unchanged.

ALTER TABLE "registration_applications"
  ADD COLUMN IF NOT EXISTS "phone_normalized" text;

UPDATE "registration_applications"
SET "phone_normalized" = regexp_replace("phone", '\D', '', 'g')
WHERE "phone_normalized" IS NULL OR "phone_normalized" = '';

-- Reject rows that cannot be normalized (should not exist in healthy data).
ALTER TABLE "registration_applications"
  ALTER COLUMN "phone_normalized" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "registration_event_phone_active_idx"
  ON "registration_applications" USING btree ("event_id", "phone_normalized")
  WHERE "registration_applications"."status" NOT IN ('rejected', 'withdrawn');
