# Server-only code

| Module | Purpose |
|--------|---------|
| `env.ts` | Server environment variables |
| `errors.ts` | Standard API error response shapes |
| `security/` | API hardening helpers + request IDs |
| `db/` | Drizzle schema + Neon client |
| `registration/` | Validation, PII encryption, blob upload, persistence |
| `verification/` | Contact challenge lifecycle + identity provider abstractions |
| `admin/` | Future registration administration repository (not public) |
| `audit/` | Audit event recording (no PII/OTP payloads) |

## Identity verification (production)

```text
Automated identity verification:
AVAILABLE ARCHITECTURALLY
NOT ENABLED FOR PRODUCTION
```

Registration persists `identity_verification_status = pending_review` with
`identity_verification_meta.provider = "manual"`.
No NIN API, POSSAP, or external identity provider is called on submit.

## Contact ownership verification (Step 4)

| Channel | Status |
|---------|--------|
| Email | IMPLEMENTED (mock in non-prod; production requires HTTP provider) |
| Phone | IMPLEMENTED (mock in non-prod; production requires HTTP provider) |

Lifecycle: generate secure OTP → deliver via provider → persist hash-only challenge →
verify with attempt/expiry/replay protection → set `email_verified_at` / `phone_verified_at`.

Contact verification does **not** approve applications.

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/registrations` | Submit registration (manual identity review) |
| `POST /api/registrations/verify` | Confirm email/phone OTP challenge |
| `POST /api/registrations/verify/resend` | Resend OTP with cooldown + rate limits |
| `GET /api/health` | Liveness + configuration check |

## Database migrations

1. `drizzle/0000_registration.sql`
2. `drizzle/0001_verification.sql`
3. `drizzle/0002_manual_identity_review.sql`
4. `drizzle/0003_contact_verification.sql`

See `docs/backend/VERIFICATION-ARCHITECTURE.md`.

## Admin foundation

`src/server/admin/registration-repository.ts` provides server-only projections and
review helpers. No admin routes, auth, or dashboard in this step.

## Challenge cleanup

Expired challenges should be purged via **Vercel Cron** or a database scheduled job.
Do not use process-local memory cleanup on serverless.
