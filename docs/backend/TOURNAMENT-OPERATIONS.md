# Tournament Competition Operations — Backend Step 7

**Competition:** KIRAKITAH GAMING 926 (`event-kg926`)  
**Rules version:** `kg926-v1`  
**Date:** August 23, 2026

---

## Overview

Backend Step 7 establishes the **competition-management foundation**:

Tournament → TournamentPhase → Phase Participants → Matches / Results → Standings

This step does **not** finalize how the 128-player pool becomes 32 qualifiers, nor how knockout brackets are generated.

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

## Qualification (PENDING PRODUCT DECISION)

`createQualificationMatches()` exists as a service boundary and returns:

`QUALIFICATION_RULES_NOT_CONFIGURED`

when pairing remains `pending`.

`advanceQualifiers()` returns the same controlled code unless:

- advancement rules are configured, **or**
- an explicit finalized ranking list is provided by an authorized admin

Do not invent scoring, group sizes, match counts, or pairing.

---

## Standings (IMPLEMENTED — technical aggregation only)

Table: `qualification_standings`

Materialized from authoritative match results via `rebuildQualificationStandings()`.

Fields: played, wins, draws, losses, points, goals_for/against, goal_difference, rank.

**IMPORTANT:** Placeholder 3/1/0 point aggregation is a **technical rebuild aid only**. It is **not** approved KG926 policy. Ranking/tie-breakers for advancement remain **PENDING PRODUCT DECISION**.

Admins cannot silently edit standings without going through match result correction.

---

## Knockout architecture (IMPLEMENTED structure / FUTURE generation)

Table: `knockout_rounds`

Seeded rounds:

1. Round of 32  
2. Round of 16  
3. Quarterfinal  
4. Semifinal  
5. Grand Final  

Bracket generation, seeding, and pairing: **PENDING PRODUCT DECISION** / **FUTURE**.

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
- `/admin/tournaments/participants` (from Step 6)

APIs under `/api/admin/tournaments/[tournamentId]/…` for phases, matches, standings, advance-qualifiers.

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
    "scoring": "pending",
    "ranking": "pending",
    "tiebreakers": "pending",
    "pairing": "pending",
    "advancement": "pending",
    "targetEntrants": 128,
    "qualificationTarget": 32
  },
  "knockout": {
    "seeding": "pending",
    "pairing": "pending",
    "rounds": ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "grand_final"]
  }
}
```

---

## Audit (IMPLEMENTED)

`PHASE_CREATED` · `PHASE_STARTED` · `PHASE_COMPLETED` · `MATCH_CREATED` · `MATCH_SCHEDULED` · `MATCH_RESULT_RECORDED` · `MATCH_RESULT_CORRECTED` · `MATCH_DISPUTED` · `MATCH_FORFEITED` · `QUALIFIER_ADVANCED`

---

## Database (IMPLEMENTED)

Migration: `drizzle/0006_tournament_operations.sql`

Tables: `tournament_phases`, `tournament_phase_participants`, `knockout_rounds`, `matches`, `match_results`, `match_result_corrections`, `qualification_standings`

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

1. Qualification scoring system  
2. Qualification group structure  
3. Number of qualification matches  
4. Match duration  
5. Tie-breakers  
6. Seeding rules  
7. Pairing rules  
8. Knockout rules  
9. No-show rules  
10. Disconnect rules  
11. Forfeit rules (detailed)  
12. Dispute process (detailed)  
13. Replacement of withdrawn participants  
14. Public standings during qualification  
15. Public gamer-tag display policy  
16. Whether player photos are ever public  
17. Final eligibility requirements  

---

## Next step

**Backend Step 8 — Finalize KG926 Qualification Mechanics & Build Qualification Engine**
