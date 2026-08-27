-- Active tournament applications: one eFootball username per event.
-- Uniqueness uses lower(btrim(gamer_tag)) — case-insensitive, trimmed.
-- Integrity rule only (not eligibility). Rejected/withdrawn rows are excluded.
--
-- Do NOT apply to Production until duplicate gamer_tag rows (if any) are reviewed.
-- If CREATE UNIQUE INDEX fails due to existing duplicates, STOP and report —
-- do not silently delete or mutate applicant records.

CREATE UNIQUE INDEX IF NOT EXISTS "registration_event_gamer_tag_active_idx"
  ON "registration_applications" USING btree (
    "event_id",
    (lower(btrim("gamer_tag")))
  )
  WHERE "registration_applications"."status" NOT IN ('rejected', 'withdrawn');
