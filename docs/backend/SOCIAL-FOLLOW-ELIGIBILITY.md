# Social follow eligibility — KIRAKITAH GAMING 926

## Product rule

Social following is **required before tournament participation**.

Social following verification is **not** required to submit the initial application.

MVP verification method: **manual admin review** (no scraping, no unofficial APIs, no OAuth).

## Required platforms (KG926)

From `src/config/social.ts`:

| Platform | Official URL |
|----------|--------------|
| X | https://x.com/Kirakitah |
| Instagram | https://www.instagram.com/kirakitah |
| TikTok | https://www.tiktok.com/@kirakitah926 |

**YouTube is not required** until an official YouTube URL is explicitly provided. The platform key remains in the extensible model with `href: null`.

## Data model

- Application columns: `social_follow_status`, `social_follow_attestation`, `social_follow_attestation_at`
- Table: `registration_social_follows` (one row per application + platform)
- Platform enum includes `x`, `instagram`, `tiktok`, `youtube` (youtube optional)
- Platform statuses: `pending` | `verified` | `rejected`
- Application status: `pending_review` | `verified` | `rejected`

## Eligibility

Rules version: **kg926-v3**

- `socialFollowingRequired: true`
- `requiredSocialPlatforms: ["x","instagram","tiktok"]`
- Pending → `SOCIAL_FOLLOWING_NOT_VERIFIED`
- Rejected → `SOCIAL_FOLLOWING_REJECTED`
- `selectParticipant()` re-evaluates eligibility and blocks selection when social compliance fails

Competition structure version remains **kg926-v1** (independent of eligibility).

## Admin

- Permission: `social:review` (SUPER_ADMIN, TOURNAMENT_ADMIN, REVIEWER)
- Queue: `/admin/reviews/social`
- Detail actions: Verify / Reject (reject requires notes)
- Audit: `SOCIAL_FOLLOW_REVIEWED`, `SOCIAL_FOLLOW_APPROVED`, `SOCIAL_FOLLOW_REJECTED`

## Migrations

- `0012_social_follow_eligibility` — social follow tables + kg926-v2 gate
- `0013_kg926_social_channels` — add `x` enum value + kg926-v3 required platform set

Apply with `npm run db:migrate` on Production after code deploy. Do not auto-apply from Cursor.
