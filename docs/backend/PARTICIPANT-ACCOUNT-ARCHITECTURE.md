# Participant Account Architecture — KIRAKITAH

**Status:** Implemented on `development` (migrations `0017`–`0018`).  
**Do not** auto-apply Production migrations from Cursor.

## Product journey

```text
REGISTER NOW
  → EMAIL VERIFICATION ONLY (reuse pre-registration OTP / Resend)
  → CHOOSE USERNAME
  → CREATE PASSWORD
  → PARTICIPANT DASHBOARD
  → COMPLETE PROFILE
  → ADMIN VERIFIES PROFILE
  → ELIGIBLE TO APPLY
  → TOURNAMENT APPLICATION
  → ELIGIBILITY / SOCIAL / IDENTITY REVIEW (existing KG926 systems)
  → PARTICIPANT SELECTION (existing admin selection)
```

## Separation of concerns

| Layer | Owns | Does not own |
|-------|------|--------------|
| **Participant account** | email, username, password, session | tournament applications, eligibility |
| **Participant profile** | persistent identity + gaming identity fields, completion %, verification status | social tournament attestation, selection |
| **Tournament application** | event-specific application, social follow review, eligibility, selection | account credentials |

**ACCOUNT ≠ PROFILE ≠ TOURNAMENT APPLICATION**

One account is reusable across multiple KIRAKITAH tournaments.

## Email verification

Reuses migration **0016** / `pre_registration_email_challenges` and Resend delivery:

- `POST /api/participant/auth/email/challenge`
- `POST /api/participant/auth/email/verify`

Preserved: 6-digit OTP, hash-only storage, 15-minute expiry, 5 attempts, 60s resend, superseding, DB rate limits, opaque proof token.

After verification: **do not** create a tournament application — continue to username/password.

If email already belongs to a participant account: safe message + LOGIN (no username/PII leakage).

Abandoned challenges do **not** permanently reserve email.

## Username

- Unique, normalized (case-insensitive)
- Not the same as eFootball **Gamer Tag**
- Server-side validation + reserved names

## Password

- scrypt hashed (same format family as admin passwords)
- Never stored plaintext, never returned by API, never logged
- Participant sessions use cookie `kirakitah_participant_session` — **not** `kirakitah_admin_session`

## Sessions

- HttpOnly, Secure in Production, SameSite=Lax
- HMAC-signed cookie + hashed row in `participant_sessions` (revocation)
- Logout revokes session
- Middleware gates `/dashboard`, `/profile`, tournament apply routes, `/api/participant/*`

Password recovery: **IMPLEMENTED** (migration `0018`).

- `POST /api/participant/auth/forgot-password` — enumeration-safe; same success message whether the email exists
- `POST /api/participant/auth/reset-password` — requires `password` + `confirmPassword`; single-use hashed token (1h TTL) consumed atomically (`UPDATE … WHERE used_at IS NULL`); clears lockout; revokes all participant sessions; does **not** auto-login; does **not** reactivate inactive accounts
- Tokens stored as `token_hash` only (`hashSensitiveValue` + `REGISTRATION_PII_ENCRYPTION_KEY`); plaintext never logged or returned
- Rate limits via `participant_login_attempts` hashed keys: 5/hour per email (**active accounts only**, after lookup), 20/hour per IP (all requests)
- Inactive accounts: no email sent, still returns generic success; reset completion rejects inactive accounts with the generic invalid-token message
- Delivery via existing Resend/`IEmailDeliveryProvider.sendPasswordResetEmail` (no parallel OTP system)
- Pages: `/forgot-password`, `/reset-password`

## Profile

Persistent fields (as applicable): first/last name, DOB, phone, NIN/passport (encrypted), private player photo (15 KB), eFootball Gamer Tag, guardian when required.

Completion is calculated **server-side**. Client cannot set `profileComplete=true`.

### Profile status

| Status | Meaning |
|--------|---------|
| `incomplete` | Required information missing |
| `submitted_for_review` | Participant submitted complete profile |
| `needs_correction` | Admin requested updates (public-safe reason) |
| `verified` | Authorized admin approved |

**100% complete ≠ verified.**

## Tournament application gate (server-enforced)

Before creating an application the server verifies:

1. Authenticated participant
2. Active account
3. Profile exists
4. Profile 100% complete
5. Profile status = `verified`
6. Tournament open (existing registration-open rules)
7. No active application for that event
8. Existing tournament eligibility rules remain authoritative after apply

Controlled codes: `PROFILE_INCOMPLETE`, `PROFILE_NOT_VERIFIED`, `PROFILE_REQUIRES_CORRECTION`, `DUPLICATE_APPLICATION`, …

## KG926 specifics

- Social (X + Instagram + TikTok) remains on the **tournament application**, manually reviewed (`kg926-v3`)
- Identity review remains manual; no automated NIN/passport/POSSAP
- Existing applications are **not** auto-converted into accounts and must not be deleted

## Admin

- Profile review: `/admin/reviews/profiles` + `identity:review` permission
- Existing `/admin/applications`, identity/social review, tournaments, qualification, schedule remain intact
- SUPPORT does not gain profile review access

## Routes

| Path | Access |
|------|--------|
| `/register`, `/register/username`, `/register/password` | Public registration journey |
| `/login` | Public |
| `/dashboard`, `/profile` | Authenticated participant |
| `/tournaments` | Public list |
| `/tournaments/[id]/apply` | Authenticated + verified profile (server gate) |
| Legacy `/esports/register` | Redirects to `/register` |

## Migrations

| Migration | Purpose |
|-----------|---------|
| `0016` | Pre-registration email OTP (existing) |
| `0017` | `participant_accounts`, `participant_profiles`, `participant_sessions`, login attempts, audit events, nullable `registration_applications.participant_account_id` |
| `0018` | `participant_password_reset_tokens` (hashed single-use reset tokens) |

Operator: `npm run db:migrate` (never `db:push`).

## Audit events (participant)

`PARTICIPANT_ACCOUNT_CREATED`, `PARTICIPANT_EMAIL_VERIFIED`, `PARTICIPANT_LOGIN_SUCCESS`, `PARTICIPANT_LOGIN_FAILURE`, `PARTICIPANT_LOGOUT`, `PARTICIPANT_PASSWORD_RESET_REQUESTED`, `PARTICIPANT_PASSWORD_RESET_COMPLETED`, `PARTICIPANT_PROFILE_SUBMITTED`, `PARTICIPANT_PROFILE_UPDATED`, `PARTICIPANT_PROFILE_APPROVED`, `PARTICIPANT_PROFILE_REJECTED`

Never log passwords, hashes, OTPs, tokens, NIN, passport contents, photos, or guardian PII.
