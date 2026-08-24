# MVP production deployment — KIRAKITAH GAMING 926

**Mode:** `MVP_MANUAL_REVIEW`  
**Competition:** KIRAKITAH GAMING 926  
**Identity:** manual review only  
**Contact OTP / SMS / email ownership:** deferred (not initiated on submit)  
**Automated NIN / passport / POSSAP:** deferred (not used)

This document is the **single operational sequence** for deploying the existing MVP registration system.

---

## Status definitions (do not conflate)

| Status | Meaning |
|--------|---------|
| **Code completed** | Repository on `development`/`main` implements fail-closed MVP registration; CI tests pass. |
| **Production configuration completed** | Vercel Production env, Neon, Blob, and encryption key are set correctly. |
| **Live smoke test completed** | Synthetic tests on Production passed (see `MVP-REGISTRATION-SMOKE-TEST.md`). |
| **Public announcement allowed** | Only after live smoke test completed. |

If Cursor or any agent cannot access Vercel Production / Neon Production / Blob Production, report:

- `CODE READY` and/or  
- `PRODUCTION CONFIGURATION NOT VERIFIED` and/or  
- `LIVE SMOKE TEST NOT PERFORMED`  

**Never** claim “Production is ready” without live verification.

---

## Required Production environment variables

### Public (safe for client)

| Variable | Required | Value |
|----------|----------|-------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical Production URL (e.g. `https://www.kirakitah.com`) |
| `NEXT_PUBLIC_DATA_SOURCE` | Yes | Must be `api` |

### Server-only (never expose to client / never commit)

| Variable | Required for MVP | Notes |
|----------|------------------|-------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob read/write token |
| `REGISTRATION_PII_ENCRYPTION_KEY` | Yes | 64 hex chars = 32 bytes AES-256-GCM |

### Explicitly NOT required for MVP submit path

| Variable | Why deferred |
|----------|----------------|
| `RESEND_API_KEY` / `EMAIL_FROM` | Contact verification deferred — no OTP email |
| `TWILIO_*` | Contact verification deferred — no OTP SMS |
| Admin auth secrets / HTTP Basic | Admin auth deferred (`MANUAL_DEFERRED_AUTH`) |
| POSSAP / NIN API credentials | Automated identity deferred |

Production **must never** silently fall back to mock DB, mock Blob, mock registration, mock email, mock SMS, or mock identity.

Generate encryption key (local only; never commit; never paste into tickets):

```bash
openssl rand -hex 32
```

---

## Operational sequence (A → T)

### A. Vercel project configuration

1. Confirm Vercel project is linked to this GitHub repository.
2. Confirm **Production branch = `main`**.
3. Confirm **Preview / integration branch = `development`**.
4. Confirm Node.js **22** (`.nvmrc` / project settings).
5. Confirm `vercel.json` redirects `/dev` → `/` on hosted environments.
6. Confirm middleware continues to protect `/admin` and `/api/admin`.
7. Confirm `public/robots.txt` disallows sensitive internal routes.

Do not use mock providers on the Production environment.

### B. Production environment variables

In Vercel → Project → Settings → Environment Variables → **Production**:

1. Set `NEXT_PUBLIC_SITE_URL`
2. Set `NEXT_PUBLIC_DATA_SOURCE=api`
3. Set `DATABASE_URL` (Neon Production)
4. Set `BLOB_READ_WRITE_TOKEN`
5. Set `REGISTRATION_PII_ENCRYPTION_KEY` (64 hex)

Redeploy after changing env vars.

### C. Neon database creation / configuration

1. Create or select the Production Neon project/branch.
2. Copy the connection string into Vercel `DATABASE_URL` (Production only).
3. Take a Neon snapshot / PITR restore point before migrations.

### D. Apply migrations `0000` → `0010`

From a secure shell with Production `DATABASE_URL` set (never logged):

```bash
npm ci
npm run db:migrate
```

Expected files in order: `0000` … `0010` (see `PRODUCTION-MIGRATIONS.md`).

Do **not** assume migrations are already applied. Do **not** run `db:push` on Production unless Product Engineering explicitly approves.

### E. Confirm KG926 tournament state

Run on Neon (secure console):

```sql
SELECT id, name, game, commencement_date, target_participant_count, qualification_target,
       prize_info, status
FROM tournaments
WHERE id = 'event-kg926';
```

Expected:

| Field | Value |
|-------|--------|
| Name | KIRAKITAH GAMING 926 |
| Game | eFootball Mobile |
| Commencement | 2026-09-14 |
| Target players | 128 |
| Qualification | 32 |
| Prize | US$100 Grand Prize |
| Status | `registration_open` |

If this query cannot be run: report **KG926 live state = UNKNOWN**.

Do not invent a registration deadline.

### F. Configure Vercel Blob

1. Enable Blob for the Vercel project.
2. Set Production `BLOB_READ_WRITE_TOKEN`.
3. Confirm uploads use **private** access (application code must not return public URLs to applicants).

### G. Generate / configure encryption key

1. Generate with `openssl rand -hex 32`.
2. Set as Production `REGISTRATION_PII_ENCRYPTION_KEY`.
3. Store securely offline; never commit; never print in logs/docs.

If unset locally: report **NOT CONFIGURED**.

### H. Deploy `main`

1. Merge approved `development` → `main` (or promote the intended revision).
2. Confirm Vercel Production deployment succeeds for that commit.
3. Confirm Production env vars are present on that deployment.

### I. Check `/api/health`

```http
GET https://<production-host>/api/health
```

Expect safe JSON including:

- `registrationMode`: `MVP_MANUAL_REVIEW`
- `contactVerification`: `DEFERRED`
- `databaseConfigured`: true
- `blobConfigured`: true
- `registrationConfigured`: true
- `dataSource`: `api`
- `identityVerificationMode`: `manual`
- `launchGateHint` present

Must **not** expose `DATABASE_URL`, Blob token, encryption key, or provider secrets.

### J. Check MVP readiness

Authenticated:

```http
GET /api/admin/system/readiness
```

Expect gate: **`MVP_REGISTRATION_READY`** (not full `REGISTRATION_READY`).

`applicationsReceivable` should be true when MVP infra checks pass.

Full `REGISTRATION_READY` remains reserved for `FULL_PRODUCTION` + contact providers + admin auth.

### K. Submit one synthetic test application

Use synthetic adult data + valid JPEG/PNG/WebP ≤ 5 MB.  
Do not use real NIN/passport numbers of real people.

### L. Confirm application exists in Neon

Verify row by `reference_id` (e.g. `KG926-2026-XXXXXX`):

- `status` received / active pipeline as implemented
- `identity_verification_status` = `pending_review`
- `identity_verification_provider` = `manual`
- `email_verification_status` = `pending`
- `phone_verification_status` = `pending`

### M. Confirm player photo exists privately in Blob

- Object exists under private pathname
- Applicant never received a public Blob URL
- Photo is not stored as binary in PostgreSQL (pathname/hash only)

### N. Confirm no OTP was sent

Under `MVP_MANUAL_REVIEW`:

- No OTP generated for ownership proof
- No email sent
- No SMS sent
- No verification challenge created for contact ownership

### O. Confirm identity status is `pending_review`

No automated NIN/passport lookup. No POSSAP. Manual review only.

### P. Confirm duplicate application is rejected

Retry same email, phone, and identity number → expect rejection (`APPLICATION_EXISTS` or equivalent).

### Q. Confirm minor / guardian flow

- Age 10–17 with guardian → accepted when valid  
- Under 10 → rejected  
- No guardian OTP

### R. Confirm application reference is returned

Safe reference like `KG926-2026-XXXXXX`. Response must not expose NIN, passport, encrypted PII, OTP, internal DB IDs, Blob URLs, or admin data.

Success UX language: application **received** / “YOU'RE IN THE SYSTEM” — not “Registration confirmed” as final verified entry.

### S. Check Production logs for accidental PII

Scan recent registration logs: should include request/reference IDs only — not identification numbers, emails, phones, or photo URLs.

### T. Only then announce registration publicly

Public marketing / social / WhatsApp announcement is allowed **only after** A–S pass.

---

## What this MVP does on submit

```
Registration form
  → client validation
  → POST /api/registrations
  → production configuration checks (fail-closed)
  → registration-open check (tournament.status === registration_open)
  → rate limiting
  → duplicate checks (email / phone / identity)
  → player photo validation (MIME + magic bytes, ≤ 5 MB)
  → private Vercel Blob upload
  → Neon insert
  → identity_verification_status = pending_review
  → identity_verification_provider = manual
  → email_verification_status = pending
  → phone_verification_status = pending
  → reference ID returned
  → success screen (received for review)
```

**Does not:** initiate OTP, send email/SMS, call POSSAP, auto-verify NIN/passport, claim email/phone verified.

---

## Related documents

- `MVP-MANUAL-REGISTRATION.md` — policy  
- `MVP-REGISTRATION-SMOKE-TEST.md` — synthetic test plan  
- `PRODUCTION-MIGRATIONS.md` — migration commands  
- `PRODUCTION-READINESS.md` — full vs MVP gates  
- `DEPLOYMENT-STATUS-MATRIX.md` — checklist snapshot  
