# Tournament Eligibility & Participation — Backend Step 6

**Competition:** KIRAKITAH GAMING 926 (`event-kg926`)  
**Rules version:** `kg926-v1`  
**Date:** August 23, 2026

---

## Overview

Backend Step 6 introduces the tournament entity, eligibility evaluation engine, and tournament participation layer. This is the foundation for future qualification and knockout operations (Step 7).

**Registration application ≠ tournament participant.** These represent different lifecycle stages:

```text
RegistrationApplication
        ↓
EligibilityEvaluation (on demand / at selection)
        ↓
TournamentParticipation (admin selection)
        ↓
Qualification          [FUTURE — Step 7]
        ↓
Knockout                 [FUTURE — Step 7]
```

---

## Status legend

| Label | Meaning |
|-------|---------|
| **IMPLEMENTED** | Built and tested in this step |
| **PENDING** | Architecture boundary exists; Product Owner decision required |
| **FUTURE** | Explicitly out of scope for Step 6 |

---

## Tournament model (IMPLEMENTED)

Table: `tournaments`

| Field | KG926 value |
|-------|-------------|
| `id` | `event-kg926` |
| `slug` | `kirakitah-gaming-926` |
| `name` | KIRAKITAH GAMING 926 |
| `game` | eFootball Mobile |
| `edition` | 926 |
| `format` | Online 1v1 |
| `status` | `registration_open` |
| `commencement_date` | 2026-09-14 |
| `target_participant_count` | 128 |
| `qualification_target` | 32 |
| `prize_info` | US$100 Grand Prize |
| `registration_start` | `null` (not invented) |
| `registration_deadline` | `null` (not invented) |
| `eligibility_rules_version` | `kg926-v1` |

### Tournament status enum (IMPLEMENTED)

`draft` · `registration_open` · `registration_closed` · `qualification` · `knockout` · `completed` · `cancelled`

Only states needed now are seeded/used. Future states exist in schema for lifecycle continuity.

---

## Participant model (IMPLEMENTED)

Table: `tournament_participants`

- Links `tournament_id` + `application_id`
- **Unique constraint** on `(tournament_id, application_id)` — prevents duplicate participation
- Does **not** duplicate applicant PII — uses relationships
- Status enum: `selected` · `withdrawn` · `disqualified`

**Note:** `approved` application status does **not** automatically create a participant. Selection is a separate admin action.

---

## Eligibility engine (IMPLEMENTED)

Location: `src/server/tournament/eligibility/`

| Module | Purpose |
|--------|---------|
| `eligibility-types.ts` | Types, `KG926_ELIGIBILITY_RULES_VERSION` |
| `eligibility-rules.ts` | Config parsing, default KG926 rules |
| `eligibility-reasons.ts` | Controlled reason codes + labels |
| `eligibility-service.ts` | `evaluateRegistrationEligibility`, window resolution |

### Eligibility does NOT approve

The engine **evaluates only**. It returns:

```json
{
  "eligible": false,
  "reasons": ["IDENTITY_PENDING"],
  "rulesVersion": "kg926-v1"
}
```

Admin selection (`selectParticipant`) re-evaluates before creating a participant record.

---

## Eligibility rules — kg926-v1 (IMPLEMENTED)

Stored in `tournaments.eligibility_rules` JSONB:

```json
{
  "minimumAge": 10,
  "emailVerificationRequired": false,
  "phoneVerificationRequired": false,
  "applicationApprovedRequired": true,
  "approvedApplicationStatus": "verified",
  "identityVerifiedRequired": true,
  "requireGuardianForMinors": true
}
```

### Configurable requirements (PENDING — PO decisions)

| Setting | Default | PO decision |
|---------|---------|-------------|
| `emailVerificationRequired` | `false` | Is email mandatory for eligibility? |
| `phoneVerificationRequired` | `false` | Is phone mandatory for eligibility? |
| `applicationApprovedRequired` | `true` | Is `verified` status sufficient for selection? |

When a requirement is `false`, missing verification does **not** make the applicant ineligible.

---

## Eligibility factors (IMPLEMENTED)

1. Minimum age (10+) — uses `calculateAge` from `src/domain/registration.ts`
2. Application status — respects existing lifecycle (`verified` = approved equivalent)
3. Identity review — manual only: `pending_review` / `verified` / `rejected`
4. Email verification — configurable
5. Phone verification — configurable
6. Guardian requirement — ages 10–17
7. Guardian consent — record must exist with `consent_at`
8. Duplicate participation — unique DB constraint + `ALREADY_SELECTED` reason
9. Registration window — server-side, timezone-aware

### Age rules (IMPLEMENTED)

| Age | Rule |
|-----|------|
| Under 10 | Ineligible (`AGE_BELOW_MINIMUM`) |
| 10–17 | Guardian info + consent required |
| 18+ | Guardian not required |

### Identity (IMPLEMENTED)

- Manual review only — **no POSSAP**, no automated NIN/passport verification
- `pending_review` → not fully eligible
- `rejected` → ineligible
- `verified` → identity criterion passes

---

## Reason codes (IMPLEMENTED)

`AGE_BELOW_MINIMUM` · `APPLICATION_NOT_APPROVED` · `APPLICATION_REJECTED` · `APPLICATION_WITHDRAWN` · `IDENTITY_PENDING` · `IDENTITY_REJECTED` · `EMAIL_NOT_VERIFIED` · `PHONE_NOT_VERIFIED` · `GUARDIAN_INFORMATION_MISSING` · `GUARDIAN_CONSENT_MISSING` · `TOURNAMENT_REGISTRATION_CLOSED` · `TOURNAMENT_REGISTRATION_NOT_OPEN` · `ALREADY_SELECTED` · `TOURNAMENT_NOT_FOUND` · `APPLICATION_NOT_FOUND`

---

## Eligibility snapshot (IMPLEMENTED)

Table: `eligibility_evaluations`

Stored when eligibility is evaluated (especially at selection). Contains:

- `tournament_id`, `application_id`
- `rules_version`
- `eligible`, `reason_codes`
- `evaluated_requirements` (no PII)
- `evaluator_type` (`system` | `admin`)
- `participant_id` (linked after selection)

---

## Participant selection (IMPLEMENTED)

Service: `selectParticipant(tournamentId, referenceId)`

Flow:

1. Load tournament + application + guardian + existing participant
2. Evaluate eligibility — reject if ineligible
3. Insert eligibility snapshot
4. Insert participant (`status = selected`)
5. Link snapshot to participant
6. Audit: `ELIGIBILITY_EVALUATED`, `PARTICIPANT_SELECTED`

**Concurrency:** Unique constraint on `(tournament_id, application_id)` prevents duplicate records. Duplicate selection returns idempotent success.

**Capacity:** `target_participant_count = 128` is stored. Automatic closure at capacity is **PENDING** (PO decision).

---

## Withdrawal / disqualification (IMPLEMENTED)

| Operation | Status | Audit event |
|-----------|--------|-------------|
| `withdrawParticipant` | `withdrawn` | `PARTICIPANT_WITHDRAWN` |
| `disqualifyParticipant` | `disqualified` | `PARTICIPANT_DISQUALIFIED` |

- Records are never deleted
- Disqualification requires authorized admin + reason (min 8 chars)
- Idempotent for already-withdrawn / already-disqualified

Detailed disqualification rules: **FUTURE** (PO decision)

---

## Admin integration (IMPLEMENTED)

### Permissions

| Permission | SUPER_ADMIN | TOURNAMENT_ADMIN | REVIEWER | SUPPORT |
|------------|:-----------:|:----------------:|:--------:|:-------:|
| `tournament:view` | ✓ | ✓ | ✓ | — |
| `tournament:eligibility` | ✓ | ✓ | ✓ | — |
| `tournament:participant_select` | ✓ | ✓ | — | — |
| `tournament:participant_withdraw` | ✓ | ✓ | — | — |
| `tournament:participant_disqualify` | ✓ | ✓ | — | — |

### API routes

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/admin/tournaments/[tournamentId]/eligibility/[referenceId]` | `tournament:eligibility` |
| GET | `/api/admin/tournaments/[tournamentId]/participants` | `tournament:view` |
| POST | `/api/admin/tournaments/[tournamentId]/participants` | `tournament:participant_select` |
| POST | `.../participants/[participantId]/withdraw` | `tournament:participant_withdraw` |
| POST | `.../participants/[participantId]/disqualify` | `tournament:participant_disqualify` |

### Admin UI

- Application detail: eligibility panel (`TournamentEligibilityPanel`)
- `/admin/tournaments/participants` — paginated participant list

Public registration flow unchanged — no internal eligibility exposure to applicants.

---

## Audit (IMPLEMENTED)

New admin audit event types:

- `ELIGIBILITY_EVALUATED`
- `PARTICIPANT_SELECTED`
- `PARTICIPANT_WITHDRAWN`
- `PARTICIPANT_DISQUALIFIED`

Metadata is safe — no NIN, passport, email, phone, or guardian contacts.

---

## Database (IMPLEMENTED)

Migration: `drizzle/0005_tournament_eligibility.sql`

Tables: `tournaments`, `tournament_participants`, `eligibility_evaluations`

Constraints: unique slug, unique participant per tournament/application, FK relationships, indexes.

---

## Security (IMPLEMENTED)

- No public tournament administration
- No public participant mutation
- No sensitive PII in eligibility APIs
- RBAC enforced server-side on all admin routes
- CSRF protection on state-changing admin requests

---

## Open product decisions (PENDING)

1. Is email verification mandatory for tournament eligibility?
2. Is phone verification mandatory?
3. What exactly constitutes guardian verification?
4. Is application approval (`verified` status) sufficient for selection?
5. Are there geographic restrictions?
6. What happens when the 128-player target is reached?
7. Final qualification mechanics (32 qualifiers)?
8. Knockout rules?
9. Match/disconnection rules?
10. Final disqualification policy details?

Defaults are explicit in `eligibility_rules` JSONB and documented as PO-pending.

---

## Scope confirmation

### NOT built in Step 6

- Bracket engine
- Match engine / live scoring
- Matchmaking
- Qualification scoring
- Payment processing
- Automated identity verification / POSSAP
- Automatic eligibility approval
- Automatic participant selection
- Guardian OTP

### Next step

**Backend Step 7 — Tournament Qualification & Competition Operations**
