# Verification Architecture — Step 3 / 3A / 4

**Status:** Contact ownership verification implemented; identity remains manual  
**Scope:** Identity (manual), email ownership, phone ownership, admin foundation boundaries

---

## Three separate verification concepts

| Concept | Production behaviour | Approves application? |
|---------|----------------------|------------------------|
| Identity (NIN / Passport) | Manual `pending_review` | No |
| Email ownership | Challenge + OTP | No |
| Phone ownership | Challenge + OTP | No |

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

## Contact verification lifecycle (IMPLEMENTED)

```text
Applicant submits registration
   ↓
Application persisted (status: received)
   ↓
Email challenge generated when Resend is configured (secure OTP)
   ↓
Resend delivers verification email (delivery-only)
   ↓
Applicant verifies OTP → email_verified_at
```

**Production email delivery:** Resend (`ResendEmailDeliveryProvider`).  
See [EMAIL-PROVIDER-SETUP.md](../deployment/EMAIL-PROVIDER-SETUP.md).

Phone/SMS delivery remains deferred. Email is **verifiable** but **not required** for KG926 eligibility yet. Applications remain valid while email is pending.

```text
Provider delivery attempted
   ↓
On success: persist challenge (code hash only)
   ↓
Applicant submits code via POST /api/registrations/verify
   ↓
email_verified_at set
```

### Challenge rules

| Rule | Value |
|------|-------|
| OTP | 6 digits via `crypto.randomInt` |
| Storage | `code_hash` + `destination_hash` only |
| TTL | 15 minutes (`VERIFICATION_CHALLENGE_TTL_MINUTES`) |
| Max attempts | 5 (`max_attempts` column) |
| Single-use | `verified_at` consumed; conditional update for concurrency |
| Resend cooldown | 60 seconds |
| Resend rate limit | 5 / hour / application / channel (DB-backed) |
| Attempt rate limit | 30 / hour / application / channel (DB-backed) |

### Provider status

| Provider | Non-production | Production |
|----------|----------------|------------|
| Mock email/SMS | Allowed | **Rejected (fail closed)** |
| Resend email | Optional | **Production delivery** (`RESEND_API_KEY`) |
| HTTP email/SMS | Optional | Legacy adapter (`*_API_URL` + `*_API_KEY`) |
| `none` | Skips channel | Skips channel |

SMS remains deferred until a Product Owner–approved provider is configured. Mock delivery tests do **not** prove real provider delivery.

### Provider failure behaviour

1. Generate OTP in memory  
2. Attempt delivery  
3. Persist challenge **only if** delivery succeeds  
4. Never mark `*_verified_at` on failure  
5. Never claim a message was sent when delivery failed  

### APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/registrations/verify` | Confirm challenge (`referenceId`, `channel`, `challengeId`, `code`) |
| `POST /api/registrations/verify/resend` | Resend with cooldown + rate limits |

Controlled error codes: `VERIFICATION_INVALID`, `VERIFICATION_EXPIRED`, `VERIFICATION_EXHAUSTED`, `VERIFICATION_NOT_FOUND`, `VERIFICATION_ALREADY_USED`, `VERIFICATION_RATE_LIMITED`, `VERIFICATION_COOLDOWN`, `VERIFICATION_NOT_CONFIGURED`, `VERIFICATION_ALREADY_VERIFIED`, `PROVIDER_UNAVAILABLE`.

Endpoints are enumeration-safe: missing applications and missing challenges return generic not-found responses.

---

## Frontend

After success (`APPLICATION RECEIVED`):

- Application received messaging (not approved/qualified)
- Manual identity review messaging
- Email verification panel when a challenge was delivered
- Unavailable/pending safe states when providers are not configured

---

## Admin foundation (FUTURE ADMIN FUNCTIONALITY)

Server-only repository: `src/server/admin/registration-repository.ts`

| Method | Purpose |
|--------|---------|
| `getApplicationByReference` | General projection |
| `listApplications` | Summaries |
| `getPendingIdentityReviews` | Manual identity queue |
| `updateIdentityReview` | Approve/reject identity only (does not auto-approve application) |
| `updateApplicationStatus` | Explicit status changes |
| `getSensitiveIdentityData` | Decrypt NIN/passport (admin only) |
| `getGuardianData` | Guardian projection |
| `getPlayerPhotoProjection` | Private blob key metadata |

**No public admin routes. No admin auth. No dashboard in Step 4.**

Review fields prepared: `identity_reviewed_at`, `identity_reviewed_by`, `identity_review_notes`.

Audit events: `EMAIL_VERIFIED`, `PHONE_VERIFIED`, `IDENTITY_REVIEW_APPROVED`, `IDENTITY_REVIEW_REJECTED`, `APPLICATION_STATUS_CHANGED` — never store OTP/PII in audit metadata.

---

## Guardian verification

Guardian OTP is **not** implemented. Player email/phone verification does not equal guardian verification. Product Owner decision required for a future step.

---

## Cleanup strategy

Expired challenges: future **Vercel Cron** or database scheduled cleanup. No process-memory cleanup.

---

## Rate limiting note

Registration and verification rate limits are **DB-backed** (not process-local memory). This is appropriate for Vercel serverless. Distributed edge rate limiting may be added later; do not claim fully managed edge rate limiting today.

---

## Database

| Migration | Purpose |
|-----------|---------|
| `0000_registration.sql` | Applications + guardians |
| `0001_verification.sql` | Verification columns + challenges |
| `0002_manual_identity_review.sql` | `pending_review` identity status |
| `0003_contact_verification.sql` | `email_verified_at`, `phone_verified_at`, `max_attempts`, `superseded_at`, identity review fields, audit events, indexes |

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
