# Registration launch checklist — KIRAKITAH GAMING 926

Competition brand: **KIRAKITAH GAMING 926** (not “2026”). Commencement: **14 September 2026**.

Identity verification: **MANUAL ONLY**.

## Launch gate states

- `REGISTRATION_NOT_READY`
- `REGISTRATION_READY`

Do not infer readiness from a green CI build alone.

## External blockers (typical)

| Dependency | Status until configured |
|------------|-------------------------|
| Real email provider credentials | EMAIL DELIVERY = BLOCKED |
| Real SMS provider credentials | SMS DELIVERY = BLOCKED |
| Real admin auth provider | ADMIN AUTH = BLOCKED |
| Neon production migrations through 0010 | MIGRATIONS = BLOCKED |
| Vercel Production env: `NEXT_PUBLIC_DATA_SOURCE=api` + secrets | CONFIG = BLOCKED |

## Production test matrix

Use synthetic test applicants only. Never use real people’s NIN/passport/photos.

| # | Test | Expected |
|---|------|----------|
| 1 | Valid adult registration | Application persisted; reference `KG926-…`; identity `pending_review` |
| 2 | Minor registration | Guardian required + stored |
| 3 | Invalid email | `VALIDATION_ERROR` |
| 4 | Duplicate email | `DUPLICATE_EMAIL` |
| 5 | Duplicate phone | `DUPLICATE_PHONE` |
| 6 | Duplicate NIN | `DUPLICATE_IDENTITY` |
| 7 | Duplicate passport | `DUPLICATE_IDENTITY` |
| 8 | Invalid NIN format | validation error |
| 9 | Invalid passport format | validation error |
| 10 | Oversized photo | `PHOTO_TOO_LARGE` |
| 11 | Invalid photo file / magic mismatch | `PHOTO_INVALID` |
| 12 | Email OTP success | email verified |
| 13 | Email OTP incorrect | controlled verification error |
| 14 | Email OTP expired | controlled verification error |
| 15 | Email OTP max attempts | controlled verification error |
| 16 | Email resend cooldown | cooldown / rate limit |
| 17 | Phone OTP success | phone verified |
| 18 | Phone OTP incorrect | controlled verification error |
| 19 | Phone resend cooldown | cooldown / rate limit |
| 20 | Identity enters manual review | `pending_review`, provider `manual` |
| 21 | Admin identity approval | identity approved; application not auto-verified |
| 22 | Admin identity rejection | explicit rejection + audit |
| 23 | Application status transition | audited transition |
| 24 | Eligibility evaluation | separate from identity |
| 25 | Participant selection | separate from application received |

## Product / legal pending

- Capacity auto-reject at 128: **CAPACITY_POLICY_PENDING** (do not invent waitlist).
- Data retention periods: **PENDING_PRODUCT_LEGAL_POLICY**.
- Guardian OTP: future Product Owner decision (not inventing requirements).
- Privacy Policy: if placeholder, do not claim legal compliance — update content with counsel.

## Rate limiting note

Registration rate limits are database-backed application checks (email/IP). This is **not** a full distributed edge / DDoS protector.
