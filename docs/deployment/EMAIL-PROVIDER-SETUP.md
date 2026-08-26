# Email provider setup — KIRAKITAH GAMING 926

**Status:** Production email verification uses **Resend** on the verified `kirakitah.com` domain.

SMS remains deferred. Email verification is **verifiable** but **not yet required** for KG926 eligibility.

## Production provider: Resend

| Item | Value |
|------|--------|
| Provider | Resend |
| Domain | `kirakitah.com` (verified) |
| From | `KIRAKITAH <no-reply@kirakitah.com>` |
| Delivery class | `ResendEmailDeliveryProvider` (`src/server/verification/email/resend.ts`) |

Resend is **delivery only**. OTP generation, hashing, expiry, attempts, cooldown, and rate limits remain in the contact challenge lifecycle.

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

## Failure behavior

If Resend rejects the request or the network fails:

- Delivery status `unavailable`
- Email is **not** marked verified
- Challenge row is **not** created (send-before-persist)
- Applicant sees a controlled “messaging unavailable” message
- Logs include only safe metadata (provider, HTTP status category) — never OTP, API key, or email body

## Smoke test (Product Owner mailbox only)

1. Confirm Production has `RESEND_API_KEY` (never paste into chat/git).
2. Optionally set `EMAIL_VERIFICATION_PROVIDER=resend` and `EMAIL_FROM=KIRAKITAH <no-reply@kirakitah.com>`.
3. Submit a **synthetic** adult registration to a mailbox you control (not a real applicant).
4. Confirm email arrives From `KIRAKITAH <no-reply@kirakitah.com>` with the correct subject and readable OTP.
5. Enter OTP via the success-page panel or `POST /api/registrations/verify`.
6. Confirm `email_verification_status = verified` and `email_verified_at` populated.
7. Confirm wrong OTP / cooldown / resend still behave correctly.

Until steps 3–6 succeed on a controlled mailbox: treat live delivery as **pending smoke confirmation**.

## Security requirements

- `RESEND_API_KEY` is server-only
- No `NEXT_PUBLIC_RESEND_API_KEY`
- No secrets in client bundle, logs, tests, screenshots, or Git
- Mock providers never operate in Production

## Policy boundary

```text
EMAIL = VERIFIABLE
EMAIL ≠ REQUIRED FOR ELIGIBILITY (yet)
```

Applications remain valid while email verification is pending.
