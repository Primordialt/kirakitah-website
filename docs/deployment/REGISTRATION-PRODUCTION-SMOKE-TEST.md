# Registration production smoke test — KIRAKITAH GAMING 926

Use **synthetic** identities only. Never use real people’s NIN, passport, photos, or phone numbers.

Prerequisites: Production (or dedicated staging) with real email/SMS/admin providers configured, migrations through `0010`, tournament status intentionally `registration_open`.

**Do not claim pass** for email/SMS/admin until those providers actually deliver.

## Tests

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Adult registration | Application persisted; reference `KG926-…`; identity `pending_review` / provider `manual` |
| 2 | Minor registration | Guardian required + stored; not exposed publicly |
| 3 | Invalid email | `VALIDATION_ERROR` |
| 4 | Duplicate email | `DUPLICATE_EMAIL` |
| 5 | Duplicate phone | `DUPLICATE_PHONE` |
| 6 | Duplicate NIN | `DUPLICATE_IDENTITY` |
| 7 | Duplicate passport | `DUPLICATE_IDENTITY` |
| 8 | Invalid NIN format | validation error |
| 9 | Invalid passport format | validation error |
| 10 | Invalid photo / magic mismatch | `PHOTO_INVALID` |
| 11 | Oversized photo | `PHOTO_TOO_LARGE` |
| 12 | Email OTP success | email verified |
| 13 | Email OTP failure | controlled verification error |
| 14 | Email OTP expiry | controlled verification error |
| 15 | Email resend cooldown | cooldown / rate limit |
| 16 | Phone OTP success | phone verified |
| 17 | Phone OTP failure | controlled verification error |
| 18 | Phone resend cooldown | cooldown / rate limit |
| 19 | Manual identity review | admin sees masked ID; reveal permissioned |
| 20 | Admin identity approval | identity approved; application **not** auto tournament-confirmed |
| 21 | Admin identity rejection | explicit rejection + audit |
| 22 | Application status change | audited transition |
| 23 | Eligibility evaluation | separate from identity / contact verification |

## Pass criteria notes

- OTP must never appear in API JSON in production
- Photos must remain private
- Gate must not be `REGISTRATION_READY` if any required check is not `CONFIGURED`
