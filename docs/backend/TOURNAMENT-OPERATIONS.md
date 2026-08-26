# Tournament Competition Operations — Backend Steps 7–10

**Competition:** KIRAKITAH GAMING 926 (`event-kg926`)  
**Rules version:** `kg926-v1`  
**Date:** August 23, 2026

---

## Overview

Backend Step 7 established the **competition-management foundation**.

Backend Step 8 **finalized KG926 qualification** (32 pods). See [QUALIFICATION-SYSTEM.md](./QUALIFICATION-SYSTEM.md).

Backend Step 9 **implements KIRAKITAH TOP 32 knockout execution**. See [KNOCKOUT-SYSTEM.md](./KNOCKOUT-SYSTEM.md).

Backend Step 10 adds **manual match scheduling** and a centralized **competition policy** catalog. See [MATCH-SCHEDULING.md](./MATCH-SCHEDULING.md), [SCHEDULING-SYSTEM.md](./SCHEDULING-SYSTEM.md), and [COMPETITION-POLICY.md](./COMPETITION-POLICY.md).

Qualification is **single-elimination pods**. Knockout is **single-elimination Top 32** with **manual R32 pairing**. Scheduling is **manual admin only** (operational layer). Email/SMS match notifications remain **deferred**. Authenticated participant schedule access is a **follow-up**.

---

## Status legend

| Label | Meaning |
|-------|---------|
| **IMPLEMENTED** | Built in this step |
| **PENDING PRODUCT DECISION** | Architecture ready; mechanic not finalized |
| **FUTURE** | Explicitly out of scope |

---

## Tournament phases (IMPLEMENTED)

Table: `tournament_phases`

| Phase | Type | Sequence | Capacity | Target |
|-------|------|----------|----------|--------|
| Qualification | `qualification` | 1 | 128 | 32 qualify |
| Knockout | `knockout` | 2 | 32 | — |
| Grand Final | `final` | 3 | 2 | — |

### Phase status lifecycle (IMPLEMENTED)

`draft` → `scheduled` → `active` → `completed`  
Also: `draft|scheduled|active` → `cancelled`

Transitions are validated server-side (`canTransitionPhaseStatus`).

---

## Phase participants (IMPLEMENTED)

Table: `tournament_phase_participants`

- Unique `(phase_id, participant_id)`
- Status: `active` · `qualified` · `eliminated` · `withdrawn` · `disqualified`
- Optional: `seed`, `rank`, `qualification_position`
- Withdrawn/disqualified tournament participants cannot join phases

---

## Match model (IMPLEMENTED)

Table: `matches`

- Belongs to one tournament + one phase
- Exactly two participants for 1v1 (`participant_a_id <> participant_b_id`)
- Optional `knockout_round_id`
- Status: `scheduled` · `ready` · `live` · `completed` · `cancelled` · `disputed` · `forfeited`
- Live tracking: **FUTURE**

Integrity checks (server + DB):

- Distinct participants
- Same tournament
- Both members of the phase
- Active participant status required

---

## Match results (IMPLEMENTED)

Table: `match_results`

- Scores (non-negative integers)
- Winner / draw
- `result_source`: `admin` · `player_report` · `integration` (admin only for now)
- Authoritative flag + supersession for corrections

**Public player result submission:** FUTURE  
**External game API integration:** FUTURE

---

## Qualification (IMPLEMENTED — Step 8 + operational admin UX)

**FINALIZED PRODUCT RULE:** 32 pods, 4 positions each, single elimination, 1 qualifier per pod.

Services (`src/server/tournament/qualification/`):

| Service | Purpose |
|---------|---------|
| `pod-service` | Pod CRUD, readiness dashboard, roster, Top 32 list |
| `assignment-service` | Manual pod assignment / reassignment / remove |
| `match-engine` | Match generation, results, host auto-advance, Top 32 advancement |

### Qualification operations workflow (admin)

1. Select eligible participants (separate from qualification assignment)
2. Open `/admin/tournaments/[id]/qualification` readiness panel
3. Manually assign participants → pod + position (`/qualification/participants` for roster)
4. Optionally configure HOST semifinal (host is not a participant; opponent auto-advances)
5. When pod status is `ready` (4/4), generate matches (idempotent: SF1 · SF2 · Final)
6. Record semifinal results → winners populate Final
7. Record final → pod completes with QUALIFIER (public code)
8. Advance completed pod winners to KIRAKITAH TOP 32 (`/qualification/top-32`)

**Pairing and assignment are manually controlled by the tournament team.** There is no automatic random assignment.

Key operations:

- `ensureQualificationPods()` / `assignParticipantToPod()` / `reassignParticipantToPod()`
- `setPodHostSemifinal()` / `generateQualificationPodMatches(podId)`
- `recordQualificationMatchResult()` / `completeQualificationPod()`
- `advancePodWinnerToTop32()` / `advanceAllPodWinnersToTop32()`

`advanceQualifiers()` derives Top 32 from completed pod winners. Returns `QUALIFICATION_INCOMPLETE` if any pod lacks a qualifier.

Host rule: opponent auto-advances against host slot (`auto_advance` outcome). Host is not a participant. No fake score is recorded. Audit: `QUALIFICATION_AUTO_ADVANCED` (reason category `HOST_POSITION` where recorded by the engine).

Tie-break for draws: **PENDING PRODUCT DECISION** (`requires_resolution` status).

### Role responsibilities (qualification)

| Role | Capability |
|------|------------|
| SUPER_ADMIN | All qualification operations |
| TOURNAMENT_ADMIN | Assignment, host, matches, results, Top 32 advancement |
| REVIEWER | View qualification / eligibility only |
| SUPPORT | View standings / limited tournament view — no qualification mutations |

REVIEWER does **not** receive `tournament:pod_manage`, `tournament:result_record`, `tournament:match_manage`, or `tournament:participant_select`.

---

## Standings (IMPLEMENTED — technical aggregation only)

Table: `qualification_standings`

Materialized from authoritative match results via `rebuildQualificationStandings()`.

Fields: played, wins, draws, losses, points, goals_for/against, goal_difference, rank.

**IMPORTANT:** `qualification_standings` remains a technical aggregation aid from Step 7. It is **not** the KG926 qualification advancement mechanism. Advancement is pod-winner based (Step 8).

Admins cannot silently edit standings without going through match result correction.

---

## Knockout architecture (IMPLEMENTED — Step 9)

Table: `knockout_rounds` (structure from Step 7)

Operational engine (`src/server/tournament/knockout/`):

| Service | Purpose |
|---------|---------|
| `readiness-service` | Top 32 validation |
| `pairing-service` | Manual R32 pairings |
| `bracket-service` | Bracket generation + admin view |
| `progression-service` | Results, dependency resolution, round completion |
| `completion-service` | Champion + tournament completion |

Seeded rounds: Round of 32 → Round of 16 → Quarterfinal → Semifinal → Grand Final

**FINALIZED PRODUCT RULE:** manual R32 pairing only; single-elimination progression.  
**PENDING PRODUCT DECISION:** seeding methodology, tie-break, scheduling automation, public bracket.

Admin: `/admin/tournaments/[id]/knockout`  
Permission: `tournament:knockout_manage`

Migration: `drizzle/0008_knockout_execution.sql`

---

## Result corrections (IMPLEMENTED)

Table: `match_result_corrections`

Workflow:

original authoritative result → correction (reason required) → new authoritative result → original superseded → audit

History is preserved (never deleted).

---

## Disputes / forfeits (IMPLEMENTED boundaries)

| Operation | Behavior |
|-----------|----------|
| `markMatchDisputed` | Sets status `disputed`; preserves existing result |
| `forfeitMatch` | Requires reason + authorized admin; records forfeit result |

Detailed dispute policy and forfeit/no-show timing: **PENDING PRODUCT DECISION**.

---

## Admin operations (IMPLEMENTED)

Routes:

- `/admin/tournaments`
- `/admin/tournaments/[id]`
- `/admin/tournaments/[id]/phases`
- `/admin/tournaments/[id]/matches`
- `/admin/tournaments/[id]/qualification` (readiness dashboard + pods 1–32)
- `/admin/tournaments/[id]/qualification/participants` (selected roster + assignments)
- `/admin/tournaments/[id]/qualification/pods/[n]` (assign / host / matches / results)
- `/admin/tournaments/[id]/qualification/top-32` (pod winners + advancement status)
- `/admin/tournaments/participants` (global selection list from Step 6)

APIs under `/api/admin/tournaments/[tournamentId]/…` for phases, matches, standings, qualification, advance-qualifiers / advance-top32.

---

## RBAC (IMPLEMENTED)

| Permission | SUPER_ADMIN | TOURNAMENT_ADMIN | REVIEWER | SUPPORT |
|------------|:-----------:|:----------------:|:--------:|:-------:|
| `tournament:phase_manage` | ✓ | ✓ | — | — |
| `tournament:match_view` | ✓ | ✓ | ✓ | — |
| `tournament:match_manage` | ✓ | ✓ | — | — |
| `tournament:result_record` | ✓ | ✓ | — | — |
| `tournament:result_correct` | ✓ | ✓ | — | — |
| `tournament:forfeit` | ✓ | ✓ | — | — |
| `tournament:standings_view` | ✓ | ✓ | ✓ | ✓ |
| `tournament:pod_manage` | ✓ | ✓ | — | — |
| `tournament:knockout_manage` | ✓ | ✓ | — | — |
| `tournament:match_schedule` | ✓ | ✓ | — | — |
| `tournament:policy_view` | ✓ | ✓ | ✓ | ✓ |
| `tournament:policy_manage` | ✓ | — | — | — |

---

## Public data projections (IMPLEMENTED types)

`PublicTournamentSummary` · `PublicPhaseSummary` · `PublicStanding` · `PublicMatch`

Must never include email, phone, NIN, passport, guardian, application references, or admin identity.

Public participant code format: `KG926-P0001` (assigned at selection).

Player registration photos remain **private**. Public photos: **PENDING PRODUCT DECISION**.

---

## Competition rules config (IMPLEMENTED)

Stored in `tournaments.competition_rules`:

```json
{
  "rulesVersion": "kg926-v1",
  "qualification": {
    "format": "single_elimination_pods",
    "podCount": 32,
    "positionsPerPod": 4,
    "qualifiersPerPod": 1,
    "maxMatchesPerNormalPod": 3,
    "maxQualificationMatches": 96,
    "targetEntrants": 128,
    "qualificationTarget": 32,
    "assignmentMode": "manual",
    "hostRule": { "enabled": true, "autoAdvanceAgainstHost": true, "hostIsNotParticipant": true },
    "tieResolution": "pending"
  },
  "knockout": {
    "format": "single_elimination",
    "entrantCount": 32,
    "pairing": "manual",
    "seeding": "pending",
    "scheduling": "manual",
    "tieResolution": "pending",
    "rounds": ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "grand_final"]
  }
}
```

---

## Audit (IMPLEMENTED)

`PHASE_CREATED` · … · `QUALIFIER_ADVANCED` · `QUALIFICATION_POD_CREATED` · `QUALIFICATION_PARTICIPANT_ASSIGNED` · `QUALIFICATION_PARTICIPANT_REASSIGNED` · `QUALIFICATION_MATCH_CREATED` · `QUALIFICATION_MATCH_RESOLVED` · `QUALIFICATION_AUTO_ADVANCED` · `QUALIFICATION_POD_COMPLETED` · `QUALIFICATION_TOP32_ADVANCED`

---

## Database (IMPLEMENTED)

Migration: `drizzle/0006_tournament_operations.sql` (Step 7)  
Migration: `drizzle/0007_qualification_engine.sql` (Step 8)

Tables: … `qualification_pods`, `qualification_pod_members`, `qualification_auto_advancements`

Also: `tournaments.competition_rules`, `tournament_participants.public_code`

---

## Security (IMPLEMENTED)

- No public competition mutation APIs
- Admin auth + RBAC + CSRF on all mutations
- No PII in public projections
- No automated identity / POSSAP
- No automatic qualification, selection, scheduling, or bracket generation

---

## Open product decisions (PENDING)

1. Match tie-resolution mechanism (qualification draws)
2. Exact eFootball match settings
3. Match duration
4. Extra time / penalties policy
5. No-show timing
6. Disconnect handling
7. Forfeit policy (detailed)
8. Dispute policy (detailed)
9. Central vs manual match scheduling
10. Random vs seeded pod assignment (beyond manual default)
11. Top 32 knockout bracket seeding
12. Knockout pairing rules
13. Public visibility of qualification pods
14. Public visibility of standings/results
15. Public gamer-tag display policy
16. Whether player photos are ever public

---

## Next step

**Backend Step 11 — Production Provider Integration, Notifications & Operational Readiness**
