# KG926 Application Experience

Participant-facing tournament application UX for KIRAKITAH GAMING 926.

## Flow

```
Tournament hub
  → Apply
  → Application pre-flight (server-authoritative)
  → Guided application wizard
  → Review
  → Submit
  → Application received
  → Eligibility / review
  → Selection
  → Qualification
```

Application submission does **not** mean eligibility, selection, or qualification.

## Pre-flight

`getApplicationPreflight(accountId, eventId)` builds a checklist from existing
account/profile/application-gate data:

- Email verified
- Profile complete
- Profile verified
- Account eligible to apply

Requirements checklist covers verified profile, tournament information,
eFootball account (from verified profile), and X / Instagram / TikTok follows.

The UI never invents `canApply = true`. Final POST still re-runs
`assertCanApplyToTournament` and uniqueness checks.

## Wizard steps

1. **Application information** — platform, timezone, availability, optional notes
2. **eFootball account** — confirm profile `gamerTag` (uniqueness already enforced server-side)
3. **Social requirements** — X / Instagram / TikTok handles + follow attestation
4. **Review + submit** — summary, consents, submit

No draft applications are created merely by opening the form.

## eFootball uniqueness

Uses existing normalization + tournament-scoped uniqueness (migration 0019).

Duplicate response:

`EFOOTBALL_ACCOUNT_ALREADY_REGISTERED`

Does not expose other applicants.

## Social requirements

Required platforms remain exactly:

- X
- Instagram
- TikTok

Manual review copy is preserved. Attestation is required; admin review remains authoritative.

## Application status

Uses existing statuses: `received`, `under_review`, `verified`, `rejected`, `withdrawn`.

Tournament hub shows Application / Eligibility / Selection / Qualification as
separate stages.

## Errors

Human-readable handling for:

- `PROFILE_NOT_VERIFIED`
- `PROFILE_INCOMPLETE`
- `DUPLICATE_APPLICATION`
- `EFOOTBALL_ACCOUNT_ALREADY_REGISTERED`

## Withdrawal

Participant self-withdrawal is not introduced in this phase.
