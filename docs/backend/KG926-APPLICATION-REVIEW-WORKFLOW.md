# KG926 application review → selection workflow

Operational lifecycle for **KIRAKITAH GAMING 926** participation.

## Product rule

```text
APPLICATION  ≠  ELIGIBILITY  ≠  PARTICIPANT
```

- Applicants **may** submit before social verification.
- Applicants **cannot** participate until required checks pass and an admin selects them.
- Social follow verification is **manual** (no scraping, OAuth, or unofficial APIs).
- Email OTP and SMS OTP remain **deferred** in MVP (`MVP_MANUAL_REVIEW`).
- Automated NIN / passport / POSSAP lookup is **not** enabled.

## Operational lifecycle

```text
APPLICATION RECEIVED
        ↓
IDENTITY REVIEW          (manual)
        ↓
SOCIAL REVIEW            (manual — X, Instagram, TikTok)
        ↓
APPLICATION REVIEW       (application status / approval workflow)
        ↓
ELIGIBILITY              (evaluate against kg926-v3 rules)
        ↓
PARTICIPANT SELECTION    (manual admin operation)
        ↓
QUALIFICATION            (existing phase architecture; pod assignment manual)
```

Each gate is independent. Completing one gate does not skip later gates.

## Gates (detail)

### 1. Application received

- Public form submits to `/api/registrations`.
- Success UI: **APPLICATION RECEIVED**.
- Message: participation is subject to eligibility and manual review.
- Does **not** claim qualified, selected, identity verified, or social verified.

### 2. Identity review

- Status starts pending review; provider mode = `manual`.
- Admin permission: `identity:review`.
- UI: `/admin/reviews/identity` and application detail.
- Rejected identity → eligibility fails.
- Verified identity → does **not** alone make the applicant eligible or a participant.

### 3. Social review

- Required platforms (config + eligibility `kg926-v3`): **X**, **Instagram**, **TikTok**.
- Per-platform statuses: `pending` | `verified` | `rejected`.
- Overall: `social_follow_status` = `pending_review` | `verified` | `rejected`.
- Admin permission: `social:review`.
- UI: `/admin/reviews/social` and application detail.
- Pending any required platform → `SOCIAL_FOLLOWING_NOT_VERIFIED` → selection blocked.
- Rejected any required platform → `SOCIAL_FOLLOWING_REJECTED` → selection blocked.
- All three verified → social requirement passes.

### 4. Application review

- Application `status` remains a separate control (e.g. received / under_review / verified / rejected).
- Do not collapse identity, social, application status, eligibility, and selection into one field.

### 5. Eligibility

- Rules version: **`kg926-v3`**.
- Competition structure version remains **`kg926-v1`** (independent).
- Existing product rules are authoritative — do not invent extras.
- Typical requirements include minimum age, guardian for ages 10–17, identity verified, application approval status where configured, and social following verified when required.

### 6. Participant selection

- `selectParticipant()` re-evaluates eligibility at selection time.
- If ineligible → selection fails; **no** participant row.
- If eligible → participant created (`status = selected`), evaluation snapshot stored, audit recorded.
- Duplicate selection for the same application must not create a second participant.
- UI: `/admin/tournaments/participants` (public code `KG926-P####`; no private PII in public projections).

### 7. Qualification readiness

- Selected participants can enter the existing qualification phase architecture.
- Pod assignment remains **manual** unless Product Owner requests an explicit auto-assign operation.
- Do not invent or alter qualification / knockout mechanics for this workflow.

## Admin RBAC (current map)

| Role | Social review | Identity review | Eligibility view | Participant select |
|------|---------------|-----------------|------------------|--------------------|
| SUPER_ADMIN | yes | yes | yes | yes |
| TOURNAMENT_ADMIN | yes | no | yes | yes |
| REVIEWER | yes | yes | yes | no |
| SUPPORT | no | no | no | no |

Do not broaden permissions without an explicit Product Owner decision.

## Audit (expected events)

Safe metadata only (reference IDs, statuses, actor IDs — **never** NIN, passport, email, phone, guardian PII, passwords, photo URLs).

- Identity review approve / reject events
- `SOCIAL_FOLLOW_REVIEWED`, `SOCIAL_FOLLOW_APPROVED`, `SOCIAL_FOLLOW_REJECTED`
- Eligibility evaluation records
- `PARTICIPANT_SELECTED` (and related participant mutations)

## Privacy

Public surfaces must not expose:

- social handles
- identity numbers
- guardian data
- player photos

Admin projections are permission-gated; public participant codes use `KG926-P####` only.

## Production verification checklist

1. Migrations through **0013** applied on Production Neon.
2. Tournament `event-kg926`: `eligibility_rules_version = kg926-v3`, `socialFollowingRequired = true`, `requiredSocialPlatforms = ["x","instagram","tiktok"]`.
3. SUPER_ADMIN login at `/admin/login`.
4. Synthetic application only — never destroy or alter real applicants.
5. Exercise pending → rejected → verified social paths before successful selection.
6. Confirm participant list and audit trail without logging PII.

## Related docs

- `docs/backend/SOCIAL-FOLLOW-ELIGIBILITY.md`
- `docs/backend/TOURNAMENT-ELIGIBILITY.md`
- `docs/backend/TOURNAMENT-OPERATIONS.md`
- `docs/deployment/PRODUCTION-MIGRATIONS.md`
