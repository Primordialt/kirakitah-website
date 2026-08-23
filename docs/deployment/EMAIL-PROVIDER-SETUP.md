# Email provider setup — KIRAKITAH GAMING 926

**Status: EMAIL DELIVERY = BLOCKED** until a real provider is chosen by the Product Owner, credentials are configured, and a synthetic delivery test succeeds.

Do not invent provider brands, API URLs, keys, or sender domains in this repository.

## Existing code contract

Production uses `HttpEmailDeliveryProvider` (`src/server/verification/email/http.ts`).

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `EMAIL_VERIFICATION_PROVIDER` | Yes (`http`) | `mock` is blocked in production; `none` is a Product Owner decision |
| `EMAIL_VERIFICATION_API_URL` | Yes | Absolute HTTPS URL of the delivery webhook/API |
| `EMAIL_VERIFICATION_API_KEY` | Yes | Sent as `Authorization: Bearer <key>` |

### HTTP request the app sends

`POST $EMAIL_VERIFICATION_API_URL`

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer $EMAIL_VERIFICATION_API_KEY`

JSON body:

```json
{
  "to": "<applicant-email>",
  "subject": "<templated subject>",
  "text": "<templated plain text>",
  "html": "<templated html>"
}
```

Expected success: HTTP 2xx. Any non-OK response → delivery status `unavailable` (fail closed; no pretend send).

### Template content

Built by `buildEmailVerificationTemplate`:

- Subject: `KIRAKITAH GAMING 926 — Verify Your Email`
- Includes verification code, 15-minute expiry, application reference
- Does **not** include NIN, passport, DOB, guardian data, or identity review status

OTP lifecycle (server-side, independent of provider):

- Secure generation, hashed at rest
- 15-minute expiry
- Max 5 attempts / challenge
- Single-use
- Resend cooldown 60s + hourly limits
- OTP never returned in production API responses

## Sender / DNS requirements (provider-side)

Product Owner / ops must configure with the chosen vendor:

- Verified sending domain / From address
- SPF / DKIM / DMARC as required by the vendor
- Bounce/complaint handling (vendor dashboard)

These are **outside** the Next.js app env contract.

## Test procedure (synthetic only)

1. Configure Production/Preview env with real HTTP adapter credentials.
2. Submit a synthetic adult registration to a mailbox you control.
3. Confirm email arrives with correct subject and code.
4. Complete `POST /api/registrations/verify` for email.
5. Confirm incorrect / expired / resend cooldown behaviors.
6. Confirm OTP never appears in API JSON or production logs.

Until steps 2–3 succeed: **EMAIL DELIVERY = BLOCKED**.

## Security requirements

- Store API key only in Vercel server env (not `NEXT_PUBLIC_`)
- Never commit credentials
- Never log OTP, full email in production error paths, or provider raw payloads containing codes
- Prefer dedicated transactional sending domain for KIRAKITAH

## Failure behavior

- Missing config → `UnavailableEmailDeliveryProvider` / status `unavailable`
- Provider error → application still persisted; contact verification reports unavailable
- Launch gate required check stays `NOT_CONFIGURED` until HTTP env is present
