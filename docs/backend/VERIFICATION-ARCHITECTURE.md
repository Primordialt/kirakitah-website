# Verification Architecture — Step 3 / 3A

**Status:** Implemented (manual review production path)  
**Scope:** Identity, email, and phone verification provider abstractions

---

## Production product decision (Step 3A)

```text
Automated identity verification:
AVAILABLE ARCHITECTURALLY
NOT ENABLED FOR PRODUCTION
```

KIRAKITAH does **not** run paid NIN API lookups on every registration submission.

**Production registration flow:**

```text
Applicant
   ↓
server validation
   ↓
duplicate checks
   ↓
persist application
   ↓
identity_verification_status = pending_review
   ↓
KIRAKITAH manually verifies identity
   ↓
approved / rejected
```

Registration **must not** call:

- NIN verification API
- POSSAP
- any external identity provider

Both **NIN** and **International Passport** use the same manual review path.

---

## Provider abstractions (retained for future use)

The provider architecture under `src/server/verification/` remains in the codebase:

| Provider | Purpose | Production registration |
|----------|---------|-------------------------|
| NIN mock | Local/CI testing of future automation | Not invoked |
| NIN authorized HTTP | Licensed API client (when credentials exist) | Not invoked |
| Passport stub | Documents manual-only passport handling | Not invoked |

`verifyApplicantIdentity()` remains available for future optional enablement.  
It is **not** called from `createRegistrationApplication()`.

---

## Contact verification (email / phone)

Architecture uses OTP challenges stored in `registration_verification_challenges`.

| Provider | ID | Behaviour |
|----------|-----|-----------|
| Mock | `mock` | Creates DB challenge; logs code in development |
| None | `none` | Skips verification (status: `skipped`) |

**Confirm endpoint:** `POST /api/registrations/verify`

Frontend OTP UX remains deferred.

---

## Database

| Migration | Purpose |
|-----------|---------|
| `0000_registration.sql` | Applications + guardians |
| `0001_verification.sql` | Verification columns + OTP challenges |
| `0002_manual_identity_review.sql` | Adds `pending_review` status; default for new apps |

---

## Environment variables

| Variable | Notes |
|----------|-------|
| `NIN_VERIFICATION_PROVIDER` | Optional future use only — **not used by registration submit** |
| `NIN_VERIFICATION_API_URL` / `API_KEY` | Optional future licensed provider |
| `EMAIL_VERIFICATION_PROVIDER` | `mock` \| `none` |
| `PHONE_VERIFICATION_PROVIDER` | `mock` \| `none` |
