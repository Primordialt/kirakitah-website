-- Align KG926 tournament commencement with November 2026 edition (public copy + admin policy).
UPDATE "tournaments"
SET
  "commencement_date" = '2026-11-01',
  "updated_at" = now()
WHERE "id" = 'event-kg926';
