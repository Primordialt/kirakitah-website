# SMS provider setup — KIRAKITAH GAMING 926

**Status: SMS DELIVERY = BLOCKED** until a real provider is chosen by the Product Owner, credentials are configured, and a synthetic delivery test succeeds.

Do not invent provider brands, API URLs, keys, or sender IDs in this repository.

## Existing code contract

Production uses `HttpPhoneDeliveryProvider` (`src/server/verification/phone/http.ts`).

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `PHONE_VERIFICATION_PROVIDER` | Yes (`http`) | `mock` is blocked in production; `none` is a Product Owner decision |
| `PHONE_VERIFICATION_API_URL` | Yes | Absolute HTTPS URL of the SMS webhook/API |
| `PHONE_VERIFICATION_API_KEY` | Yes | Sent as `Authorization: Bearer <key>` |

### HTTP request the app sends

`POST $PHONE_VERIFICATION_API_URL`

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer $PHONE_VERIFICATION_API_KEY`

JSON body:

```json
{
  "to": "<applicant-phone-as-submitted>",
  "message": "<templated SMS text including OTP>"
}
```

Expected success: HTTP 2xx. Non-OK → delivery status `unavailable`.

### Message content

Built by `buildPhoneVerificationSms`:

- Includes competition name **KIRAKITAH GAMING 926**
- Includes OTP + expiry minutes
- Instructs not to share the code
- Kept short for SMS limits

OTP lifecycle matches email challenges (hashing, 15 min, 5 attempts, cooldown, no OTP in production API responses).

## Sender requirements (provider-side)

Product Owner / ops must configure with the chosen vendor:

- Approved sender ID / long code / short code as applicable
- Destination country routing (Nigeria and any other allowed regions)
- Compliance / opt-out rules required by the vendor and local law

## Rate limits

Application-enforced (DB-backed):

- Resend cooldown: 60 seconds
- Resend max per hour (per application + channel): 5
- Verify attempt limits as implemented in contact challenges

This is **not** a carrier-grade DDoS shield.

## Test procedure (synthetic only)

1. Configure HTTP SMS env in the target Vercel environment.
2. Submit a synthetic registration using a test phone you control.
3. Confirm SMS arrives with OTP.
4. Verify success, incorrect code, and resend cooldown.
5. Confirm OTP never appears in public API responses or production logs.

Until steps 2–3 succeed: **SMS DELIVERY = BLOCKED**.

## Failure behavior

- Missing config → unavailable provider
- Provider error → application persisted; phone verification unavailable
- Launch gate required check stays `NOT_CONFIGURED` until HTTP env is present
