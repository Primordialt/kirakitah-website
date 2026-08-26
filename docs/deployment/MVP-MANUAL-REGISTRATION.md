# MVP Manual Registration — KIRAKITAH GAMING 926

**Product Owner decision:** Accept public applications with **email ownership verified before submit**. Phone/SMS OTP remains deferred. Identity and social follows remain manual review. Production admin authentication uses database password login.

## CURRENT MODE

`MVP_MANUAL_REVIEW`

Source of truth (code, not a hidden env flag):

`src/config/registration-policy.ts`

| Concern | Policy |
|---------|--------|
| Registration mode | `MVP_MANUAL_REVIEW` |
| Contact verification (post-submit SMS / second email OTP) | `DEFERRED` |
| Pre-registration email ownership | **REQUIRED** (server-enforced proof token) |
| Identity verification | `MANUAL` |
| Social (X + Instagram + TikTok) | Manual review |
| Admin workflow | `SECURE_PROVIDER` (database password auth) |
| Player photo maximum | **15 KB** (`15 * 1024` bytes) |

### Current registration behavior

1. Applicant enters email → sends OTP → verifies OTP (pre-registration; **no** application yet).
2. Applicant completes the form (photo required, max **15 KB**, JPEG/PNG/WebP).
3. Final submit includes opaque `emailVerificationToken` bound to that email.
4. Server validates, enforces registration-open, rate limits, duplicates, **and** email verification proof.
5. Player photo stored privately in Vercel Blob.
6. Application persisted in Neon with:
   - `status = received`
   - `identity_verification_status = pending_review` (`provider = manual`)
   - `email_verification_status = verified` + `email_verified_at` set
   - `phone_verification_status = pending` (SMS deferred)
   - social follow `pending_review`
7. Application reference returned (`KG926-…`).
8. Success UI: **APPLICATION RECEIVED** — only after persistence (never on email verify alone).
9. No second email OTP on submit; no SMS OTP.
10. No automated NIN/passport/POSSAP.
11. No automatic eligibility or participant selection.
12. Admins sign in at `/admin/login` with email + password (see `docs/admin/ADMIN-AUTH.md`).

### Duplicate email

If the email already belongs to an active/successful KG926 application:

> This email address is already registered for KIRAKITAH GAMING 926.

No second application is created. Pre-registration challenges alone do not reserve the address.

### Deferred ≠ mocked

Production still must **not** use:

- mock NIN / identity verification as real verification
- fake OTP / fake email / fake SMS marked as verified without ownership proof
- mock admin authentication on Vercel Production
- plaintext NIN/passport storage

Deferred means **SMS / post-submit contact OTP** are not required. Pre-registration email OTP **is** required.

### Admin review

RBAC, CSRF, and private photo routes remain protected.

Manual review must use a **secure operational process**.

**Do not** create insecure workarounds (`?admin=true`, shared secrets in query strings, hardcoded credentials).

## Launch gate

| Gate | Meaning |
|------|---------|
| `MVP_REGISTRATION_READY` | Infra for receiving applications is configured (DB, Blob, encryption, migrations, data source, email delivery for pre-reg OTP). SMS/admin extras may still be deferred. |
| `REGISTRATION_READY` | Full production verification stack operational (`FULL_PRODUCTION` mode + real SMS + full contact policy). |
| `REGISTRATION_NOT_READY` | Mandatory MVP infra missing. |

Authoritative endpoint: authenticated `GET /api/admin/system/readiness`

## FUTURE MODE

`FULL_PRODUCTION`

Change `REGISTRATION_OPERATING_MODE` in `src/config/registration-policy.ts` to `"FULL_PRODUCTION"` **only after**:

1. Real SMS provider configured + synthetic delivery tested
2. Product Owner confirms whether phone verification becomes mandatory
3. Full launch checklist completed (`docs/deployment/REGISTRATION-LAUNCH-CHECKLIST.md`)

## Security preserved in MVP

- Pre-registration email OTP (hash-only, 15 min, 5 attempts, 60s resend, DB rate limits)
- Short-lived server-verifiable email proof token (not client-trusted)
- Duplicate protection (email / phone / identity) — app + DB
- Rate limiting
- Input validation
- Photo MIME + magic-byte + private Blob + orphan cleanup
- Identity encryption + hashing
- Age / guardian rules
- Registration-open server gate
- No PII in public success payloads
- No OTP marked verified without ownership proof

## Capacity

128 entrant target remains **CAPACITY_POLICY_PENDING** — not auto-rejecting registrations solely at 128 unless Product Owner later decides.

## Related docs

- [EMAIL-PROVIDER-SETUP.md](./EMAIL-PROVIDER-SETUP.md)
- [VERIFICATION-ARCHITECTURE.md](../backend/VERIFICATION-ARCHITECTURE.md)
- [PRODUCTION-MIGRATIONS.md](./PRODUCTION-MIGRATIONS.md) — migration **0016** for pre-registration challenges
