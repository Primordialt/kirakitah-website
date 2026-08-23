# Server-only code

| Module | Purpose |
|--------|---------|
| `env.ts` | Server environment variables |
| `errors.ts` | Standard API error response shapes |
| `security/` | API hardening helpers |
| `db/` | Drizzle schema + Neon client |
| `registration/` | Validation, PII encryption, blob upload, persistence |
| `verification/` | Identity/email/phone providers (optional; not used for paid NIN on submit) |

## Identity verification (production)

```text
Automated identity verification:
AVAILABLE ARCHITECTURALLY
NOT ENABLED FOR PRODUCTION
```

Registration persists `identity_verification_status = pending_review`.
No NIN API, POSSAP, or external identity provider is called on submit.

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/registrations` | Submit registration (manual identity review) |
| `POST /api/registrations/verify` | Confirm email/phone OTP challenge |
| `GET /api/health` | Liveness + configuration check |

## Database migrations

1. `drizzle/0000_registration.sql`
2. `drizzle/0001_verification.sql`
3. `drizzle/0002_manual_identity_review.sql`

See `docs/backend/VERIFICATION-ARCHITECTURE.md`.
