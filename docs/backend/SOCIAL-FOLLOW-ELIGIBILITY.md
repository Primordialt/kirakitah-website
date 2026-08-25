# Social follow eligibility — KIRAKITAH GAMING 926

## Product rule

Social following is **required before tournament participation**.

Social following verification is **not** required to submit the initial application.

MVP verification method: **manual admin review** (no scraping, no unofficial APIs, no OAuth).

## Platforms

Required platforms (from `src/config/social.ts`):

- Instagram
- TikTok
- YouTube

Official account URLs currently use the existing site placeholders (`href: null` until Product Owner publishes links). Do not invent URLs.

## Data model

- Application columns: `social_follow_status`, `social_follow_attestation`, `social_follow_attestation_at`
- Table: `registration_social_follows` (one row per application + platform)
- Platform statuses: `pending` | `verified` | `rejected`
- Application status: `pending_review` | `verified` | `rejected`

## Eligibility

Rules version: **kg926-v2**

- `socialFollowingRequired: true`
- Pending → `SOCIAL_FOLLOWING_NOT_VERIFIED`
- Rejected → `SOCIAL_FOLLOWING_REJECTED`
- `selectParticipant()` re-evaluates eligibility and blocks selection when social compliance fails

Competition structure version remains **kg926-v1** (independent of eligibility).

## Admin

- Permission: `social:review` (SUPER_ADMIN, TOURNAMENT_ADMIN, REVIEWER)
- Queue: `/admin/reviews/social`
- Detail actions: Verify / Reject (reject requires notes)
- Audit: `SOCIAL_FOLLOW_REVIEWED`, `SOCIAL_FOLLOW_APPROVED`, `SOCIAL_FOLLOW_REJECTED`

## Migration

`drizzle/0012_social_follow_eligibility.sql` — apply with `npm run db:migrate` on Production after code deploy. Do not auto-apply from Cursor.
