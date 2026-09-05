-- Add Other Government-Issued ID support for participant profiles and registrations.

ALTER TYPE "identification_type" ADD VALUE IF NOT EXISTS 'other_government_id';

ALTER TABLE "participant_profiles"
  ADD COLUMN IF NOT EXISTS "government_id_type" text;

ALTER TABLE "registration_applications"
  ADD COLUMN IF NOT EXISTS "government_id_type" text;
