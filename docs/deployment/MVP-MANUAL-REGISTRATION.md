# MVP Manual Registration — KIRAKITAH GAMING 926

**Product Owner decision:** Accept public applications now while deferring email OTP and phone OTP. Production admin authentication uses database password login.

## CURRENT MODE

`MVP_MANUAL_REVIEW`

Source of truth (code, not a hidden env flag):

`src/config/registration-policy.ts`

| Concern | Policy |
|---------|--------|
| Registration mode | `MVP_MANUAL_REVIEW` |
| Contact verification | `DEFERRED` |
| Identity verification | `MANUAL` |
| Admin workflow | `SECURE_PROVIDER` (database password auth) |
| Player photo maximum | **15 KB** (`15 * 1024` bytes) |

### Current registration behavior

1. Applicant submits a valid form (photo required, max **15 KB**, JPEG/PNG/WebP).
2. Server validates, enforces registration-open, rate limits, and duplicates.
3. Player photo stored privately in Vercel Blob.
4. Application persisted in Neon with:
   - `status = received`
   - `identity_verification_status = pending_review` (`provider = manual`)
   - `email_verification_status = pending`
   - `phone_verification_status = pending`
5. Application reference returned (`KG926-…`).
6. Success UI: **APPLICATION RECEIVED** — not confirmed participant / verified identity / verified contact.
7. Email OTP / SMS OTP are **not** initiated on submit (architecture remains).
8. No automated NIN/passport/POSSAP.
9. No automatic eligibility or participant selection.
10. Admins sign in at `/admin/login` with email + password (see `docs/admin/ADMIN-AUTH.md`).

### Deferred ≠ mocked

Production still must **not** use:

- mock NIN / identity verification as real verification
- fake OTP / fake email / fake SMS marked as verified
- mock admin authentication on Vercel Production
- plaintext NIN/passport storage

Deferred means those steps are **not required before accepting the application**.

### Admin review (deferred auth)

RBAC, CSRF, and private photo routes remain protected.

Production admin HTTP auth is still unimplemented (`HTTP_ADMIN_AUTH_IMPLEMENTED = false`).

Manual review must use a **secure operational process** until a real admin provider is enabled.

**Do not** create insecure workarounds (`?admin=true`, shared secrets in query strings, hardcoded credentials).

## Launch gate

| Gate | Meaning |
|------|---------|
| `MVP_REGISTRATION_READY` | Infra for receiving applications is configured (DB, Blob, encryption, migrations, data source). Contact/admin providers may be DEFERRED. |
| `REGISTRATION_READY` | Full production verification stack operational (`FULL_PRODUCTION` mode + real email/SMS/admin). |
| `REGISTRATION_NOT_READY` | Mandatory MVP infra missing. |

Authoritative endpoint: authenticated `GET /api/admin/system/readiness`

## FUTURE MODE

`FULL_PRODUCTION`

Change `REGISTRATION_OPERATING_MODE` in `src/config/registration-policy.ts` to `"FULL_PRODUCTION"` **only after**:

1. Real email provider configured + synthetic delivery tested
2. Real SMS provider configured + synthetic delivery tested
3. Real admin authentication implemented (`HTTP_ADMIN_AUTH_IMPLEMENTED = true`) + login tested
4. Product Owner confirms whether email/phone verification is mandatory for eligibility
5. Full launch checklist completed (`docs/deployment/REGISTRATION-LAUNCH-CHECKLIST.md`)

### Future requirements

- Real email provider (`EMAIL_VERIFICATION_*`)
- Real SMS provider (`PHONE_VERIFICATION_*`)
- Real admin authentication + session secret
- Contact verification initiated on submit (`REQUIRED`)
- Complete launch gate → `REGISTRATION_READY`

Verification endpoints, OTP hashing, challenges, cooldowns, and provider abstractions remain in the codebase for this activation.

## Security preserved in MVP

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
