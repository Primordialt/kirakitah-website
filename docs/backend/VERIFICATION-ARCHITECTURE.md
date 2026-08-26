# Verification Architecture — Step 3 / 3A / 4 + Pre-registration Email

**Status:** Email ownership verification is **required before** application creation; identity remains manual; SMS deferred  
**Scope:** Identity (manual), pre-registration email ownership, phone ownership (deferred), admin foundation boundaries

---

## Three separate verification concepts

| Concept | Production behaviour | Approves application? |
|---------|----------------------|------------------------|
| Identity (NIN / Passport) | Manual `pending_review` | No |
| Email ownership | **Required before submit** (pre-registration OTP + proof token) | No (gates creation only) |
| Phone ownership | Deferred (SMS not enabled) | No |

---

## Identity verification (unchanged from Step 3A)

```text
Automated identity verification:
AVAILABLE ARCHITECTURALLY
NOT ENABLED FOR PRODUCTION
```

Registration **must not** call NIN APIs, POSSAP, or passport providers.

`identity_verification_status = pending_review`  
`identity_verification_meta.provider = "manual"`

---

## Pre-registration email verification (REQUIRED)

```text
Applicant enters email
   ↓
POST /api/registrations/email/challenge  (OTP via Resend; no application)
   ↓
Applicant enters OTP
   ↓
POST /api/registrations/email/verify  → short-lived emailVerificationToken
   ↓
Applicant completes registration form
   ↓
POST /api/registrations  (requires token bound to submitted email)
   ↓
Application persisted with email_verification_status = verified
```

**Important:**

- Do not trust client-only booleans (`emailVerified: true`).
- Token is opaque, short-lived (~15 minutes), hashed at rest, bound to normalized email.
- Changing the email in the UI invalidates prior verification state.
- Verifying email ≠ application success. Success UI appears only after persistence.
- Abandoned challenges do **not** reserve email for duplicates.

### Duplicate email

Active application statuses (`received`, `under_review`, `verified`) for the same event + email:

- Reject challenge initiate and final submit with `DUPLICATE_EMAIL`
- Message: `This email address is already registered for KIRAKITAH GAMING 926.`
- DB unique index remains authoritative for races

### Challenge rules (pre-registration table)

| Rule | Value |
|------|-------|
| Storage table | `pre_registration_email_challenges` (migration `0016`) |
| OTP | 6 digits via `crypto.randomInt` |
| Storage | `code_hash` + `email_hash` only (no plaintext OTP) |
| Challenge TTL | 15 minutes |
| Proof token TTL | 15 minutes after OTP success |
| Max attempts | 5 |
| Resend cooldown | 60 seconds |
| Resend rate limit | DB-backed per email hash |
| Superseding | Prior active challenges superseded on new send |
| Consumption | Token consumed after successful application create |

**Production email delivery:** Resend (`ResendEmailDeliveryProvider`).  
See [EMAIL-PROVIDER-SETUP.md](../deployment/EMAIL-PROVIDER-SETUP.md).

Controlled error codes include: `EMAIL_VERIFICATION_REQUIRED`, `DUPLICATE_EMAIL`, `VERIFICATION_INVALID`, `VERIFICATION_EXPIRED`, `VERIFICATION_EXHAUSTED`, `VERIFICATION_NOT_FOUND`, `VERIFICATION_ALREADY_VERIFIED`, `VERIFICATION_RATE_LIMITED`, `VERIFICATION_COOLDOWN`, `VERIFICATION_NOT_CONFIGURED`, `PROVIDER_UNAVAILABLE`.

---

## Post-application contact verification (legacy / optional path)

```text
Historical path (when email was not pre-verified):
Application persisted → email challenge on application_id → POST /api/registrations/verify
```

Preserved endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/registrations/verify` | Confirm application-bound challenge |
| `POST /api/registrations/verify/resend` | Resend with cooldown + rate limits |

When email was verified pre-registration, submit sets `emailAlreadyVerified: true` and **does not** send a second OTP. Phone/SMS remains deferred.

### Provider status

| Provider | Non-production | Production |
|----------|----------------|------------|
| Mock email/SMS | Allowed | **Rejected (fail closed)** |
| Resend email | Optional | **Production delivery** (`RESEND_API_KEY`) |
| HTTP email/SMS | Optional | Legacy adapter (`*_API_URL` + `*_API_KEY`) |
| `none` | Skips channel | Skips channel |

SMS remains deferred until a Product Owner–approved provider is configured.

### Provider failure behaviour

1. Generate OTP in memory  
2. Attempt delivery  
3. Persist challenge **only if** delivery succeeds  
4. Never mark verified on failure  
5. Never claim a message was sent when delivery failed  

---

## Frontend

`/esports/register`:

1. **EMAIL VERIFICATION** gate (send code → verify)
2. Remaining form fields
3. Submit disabled until server-backed proof token exists (UX only; server still enforces)
4. **APPLICATION RECEIVED** only after successful `POST /api/registrations`

---

## Admin display

Successfully submitted applications show `email_verification_status = VERIFIED` because verification is required before creation. Historical status fields are retained.

---

## Admin foundation

Server-only repository: `src/server/admin/registration-repository.ts`

Review fields prepared: `identity_reviewed_at`, `identity_reviewed_by`, `identity_review_notes`.

Audit events: `EMAIL_VERIFIED`, `PHONE_VERIFIED`, `IDENTITY_REVIEW_APPROVED`, `IDENTITY_REVIEW_REJECTED`, `APPLICATION_STATUS_CHANGED` — never store OTP/PII in audit metadata.

---

## Guardian verification

Guardian OTP is **not** implemented. Player email verification does not equal guardian verification.

---

## Cleanup strategy

Expired challenges: future **Vercel Cron** or database scheduled cleanup. No process-memory cleanup.

---

## Rate limiting note

Registration and verification rate limits are **DB-backed** (not process-local memory). This is appropriate for Vercel serverless.

---

## Database

| Migration | Purpose |
|-----------|---------|
| `0000_registration.sql` | Applications + guardians |
| `0001_verification.sql` | Verification columns + challenges |
| `0002_manual_identity_review.sql` | `pending_review` identity status |
| `0003_contact_verification.sql` | `email_verified_at`, `phone_verified_at`, `max_attempts`, `superseded_at`, identity review fields, audit events, indexes |
| `0016_pre_registration_email_verification.sql` | `pre_registration_email_challenges` (OTP + proof token before application) |

---

## Environment variables

| Variable | Notes |
|----------|-------|
| `EMAIL_VERIFICATION_PROVIDER` | `mock` \| `resend` \| `http` \| `none` |
| `RESEND_API_KEY` | Production Resend delivery (server-only) |
| `EMAIL_FROM` | Defaults to `KIRAKITAH <no-reply@kirakitah.com>` |
| `EMAIL_VERIFICATION_API_URL` / `API_KEY` | Legacy HTTP delivery adapter |
| `PHONE_VERIFICATION_PROVIDER` | `mock` \| `http` \| `none` (SMS deferred) |
| `PHONE_VERIFICATION_API_URL` / `API_KEY` | Production HTTP SMS delivery (not enabled) |
| `NIN_VERIFICATION_*` | Optional future only — **not used on submit** |
