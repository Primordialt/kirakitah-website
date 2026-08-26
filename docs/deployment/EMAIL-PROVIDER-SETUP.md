# Email provider setup — KIRAKITAH GAMING 926

**Status:** Production email verification uses **Resend** on the verified `kirakitah.com` domain.

SMS remains deferred.

## Product policy (current)

```text
EMAIL VERIFICATION = REQUIRED BEFORE APPLICATION SUBMISSION
SMS / PHONE OTP = DEFERRED
```

Applicants must verify email ownership **before** `POST /api/registrations` can create an application. Frontend disable alone is not sufficient — the server enforces a short-lived verification proof token bound to the normalized email.

Abandoned / unverified pre-registration challenges do **not** permanently reserve an email. Duplicate protection applies only after a successful application is created.

## Production provider: Resend

| Item | Value |
|------|--------|
| Provider | Resend |
| Domain | `kirakitah.com` (verified) |
| From | `KIRAKITAH <no-reply@kirakitah.com>` |
| Delivery class | `ResendEmailDeliveryProvider` (`src/server/verification/email/resend.ts`) |

Resend is **delivery only**. OTP generation, hashing, expiry, attempts, cooldown, and rate limits remain in the pre-registration challenge lifecycle.

## Pre-registration APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/registrations/email/challenge` | Send OTP (no application created) |
| `POST /api/registrations/email/verify` | Verify OTP → short-lived `emailVerificationToken` |
| `POST /api/registrations/email/resend` | Resend with 60s cooldown + DB rate limits |
| `POST /api/registrations` | Requires valid token bound to submitted email |

Post-submit `POST /api/registrations/verify` and `/verify/resend` remain for historical / application-bound challenges and must not be broken.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `RESEND_API_KEY` | Yes (Production) | Server-only. Never `NEXT_PUBLIC_*`. Fail closed if missing. |
| `EMAIL_FROM` | Optional | Defaults to `KIRAKITAH <no-reply@kirakitah.com>` |
| `EMAIL_VERIFICATION_PROVIDER` | Optional | `resend` \| `http` \| `mock` \| `none`. Production defaults to `resend` when `RESEND_API_KEY` is set. |

Legacy HTTP adapter (still supported):

| Variable | Notes |
|----------|-------|
| `EMAIL_VERIFICATION_API_URL` | Absolute HTTPS webhook URL |
| `EMAIL_VERIFICATION_API_KEY` | Bearer token for HTTP adapter |

### Development / test

- `EMAIL_VERIFICATION_PROVIDER=mock` (default outside strict Production)
- Mock is **blocked** in Production (fail closed → unavailable)
- Automated tests must not call the real Resend API

## Domain verification

Product Owner / ops (already completed for Production):

- Domain `kirakitah.com` verified in Resend
- SPF / DKIM / DMARC as required by Resend
- Sender: `no-reply@kirakitah.com`

## Email content

Subject: `KIRAKITAH GAMING 926 — Verify Your Email`

Includes: greeting, 6-digit code, 15-minute expiry, brand footer.

Does **not** include: NIN, passport, phone, guardian, private socials, admin notes, unnecessary application PII.

## Duplicate email

If the email already belongs to an active/successful KG926 application:

- Challenge send and final submit both reject with `DUPLICATE_EMAIL`
- User-facing message: `This email address is already registered for KIRAKITAH GAMING 926.`
- No second application is created
- No other applicant PII is exposed

## Failure behavior

If Resend rejects the request or the network fails:

- Delivery status `unavailable`
- Email is **not** marked verified
- Challenge row is **not** created (send-before-persist)
- Applicant sees a controlled “messaging unavailable” message
- Logs include only safe metadata (provider, HTTP status category) — never OTP, API key, or email body

## Production smoke test (Product Owner mailbox only)

Do **not** use a real applicant for the first smoke tests.

**Test A — happy path**

1. Controlled test mailbox → send code → verify OTP → complete form → submit
2. Receive `KG926-…` reference
3. Confirm `email_verification_status = verified` and `email_verified_at` populated

**Test B — duplicate**

1. Same verified/registered email → start second registration
2. Expect: `This email address is already registered for KIRAKITAH GAMING 926.`

**Test C — unverified submit**

1. New email → do **not** verify → attempt final submission (API)
2. Expect: `EMAIL_VERIFICATION_REQUIRED`

Also confirm wrong OTP / cooldown / resend still behave correctly.

## Security requirements

- `RESEND_API_KEY` is server-only
- No `NEXT_PUBLIC_RESEND_API_KEY`
- Hash-only OTP storage; opaque short-lived verification token (hashed at rest)
- No client-trusted `emailVerified: true` flags
- No secrets in client bundle, logs, tests, screenshots, or Git
- Mock providers never operate in Production

## Policy boundary

```text
EMAIL = REQUIRED BEFORE APPLICATION SUBMISSION
EMAIL ≠ SEPARATE POST-SUBMIT ELIGIBILITY RULE (application is created already verified)
SMS = DEFERRED
```

Migration: `drizzle/0016_pre_registration_email_verification.sql` (operator-applied on Production Neon; not auto-applied from Cursor).
