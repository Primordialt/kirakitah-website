# Registration integrity — email + eFootball uniqueness

**Scope:** Integrity rules for participant signup and tournament applications.  
**Not eligibility:** These checks do not replace profile verification, social review, identity review, or kg926-v3 eligibility.

## Email duplicate protection (registration entry)

Authoritative sources (normalized `trim` + `lowercase`):

1. `participant_accounts.email_normalized`
2. Active `registration_applications` for KIRAKITAH GAMING 926 (`event-kg926`) where status ∉ `{rejected, withdrawn}`

Flow:

```
REGISTER → enter email → server duplicate check
  → NEW email → create OTP challenge → verify → username → password → dashboard
  → EXISTING email → no OTP / no Resend / no account → EMAIL ALREADY REGISTERED → LOGIN
```

Endpoints:

- `POST /api/participant/auth/email/challenge` (primary participant signup)
- `POST /api/registrations/email/challenge` (legacy pre-registration path)

Both call `initiatePreRegistrationEmailChallenge`, which runs the duplicate gate **before** OTP creation, rate-limit counters for new challenges, or Resend delivery.

Controlled response codes: `ACCOUNT_EXISTS` | `DUPLICATE_EMAIL`  
Public message only (no username, application id, status, or other PII).

OTP security unchanged: 6-digit, hash-only, 15-minute expiry, 5 attempts, 60s resend cooldown, superseding, rate limits, no OTP in responses/logs.

## eFootball account uniqueness (per tournament)

`gamer_tag` remains the eFootball username field.

Normalization for uniqueness:

- `trim` whitespace
- compare **case-insensitively** (`lower`)
- store trimmed value with original casing

Boundary:

```
(event_id / tournament_id, lower(btrim(gamer_tag)))
```

for active applications only (status ∉ `{rejected, withdrawn}`).

Same eFootball username may apply to a **different** tournament in the future unless another product rule forbids it.

Enforcement:

1. Soft check in `applyParticipantToTournament` and `createRegistrationApplication`
2. Database unique index `registration_event_gamer_tag_active_idx` (migration **0019**) as final authority for races

Controlled error: `EFOOTBALL_ACCOUNT_ALREADY_REGISTERED`  
Public message does not reveal the existing applicant.

## Application gate order (unchanged)

```
ACCOUNT → PROFILE COMPLETE → PROFILE VERIFIED → APPLICATION
  → (email/phone/identity/gamer-tag integrity checks)
  → ELIGIBILITY (kg926-v3) → SOCIAL REVIEW → APPLICATION REVIEW → SELECTION
```

KG926 competition mechanics (`kg926-v3`, required socials X / Instagram / TikTok, qualification, pods, matches, scheduling, results, tournament RBAC) are **unchanged**.
