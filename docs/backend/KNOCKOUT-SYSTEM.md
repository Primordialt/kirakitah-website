# KG926 Knockout System — Backend Step 9

**Competition:** KIRAKITAH GAMING 926 (`event-kg926`)  
**Rules version:** `kg926-v1`  
**Date:** August 23, 2026

---

## Overview

Backend Step 9 implements **KIRAKITAH TOP 32** knockout execution:

Round of 32 → Round of 16 → Quarterfinal → Semifinal → Grand Final → Champion

Qualification (Step 8) is reused — this step does not rebuild pods.

---

## Status legend

| Label | Meaning |
|-------|---------|
| **FINALIZED PRODUCT RULE** | Approved and implemented |
| **PENDING PRODUCT DECISION** | Boundary documented; not invented |
| **IMPLEMENTED** | Built in Step 9 |

---

## Knockout structure (FINALIZED PRODUCT RULE)

```
32 qualifiers (pod winners)
    ↓
16 Round of 32 matches
    ↓
8 Round of 16 matches
    ↓
4 Quarterfinals
    ↓
2 Semifinals
    ↓
1 Grand Final
    ↓
KIRAKITAH GAMING 926 CHAMPION
```

| Round | Matches | Advancers |
|-------|---------|-----------|
| R32 | 16 | 16 |
| R16 | 8 | 8 |
| QF | 4 | 4 |
| SF | 2 | 2 |
| Grand Final | 1 | 1 champion |

Total knockout matches: **31**

Format: **single elimination**

---

## Top 32 validation (IMPLEMENTED)

`validateKnockoutReadiness(tournamentId)` — read-only.

Checks:

- Qualification phase complete (32 pod winners)
- Exactly 32 knockout phase members
- All selected / not withdrawn / not disqualified
- No duplicates
- Knockout rounds exist

Returns `KNOCKOUT_NOT_READY` with reasons when incomplete.

---

## R32 pairing (FINALIZED PRODUCT RULE — manual only)

**Do not invent seeding** (no 1vs32, no pod-number pairing, no random shuffle).

Operational strategy: `pairing: "manual"`

1. Admin configures exactly 16 pairings via `setKnockoutPairings()`
2. All 32 unique Top 32 participants required
3. No self-matches
4. Confirmation audited: `KNOCKOUT_PAIRINGS_CONFIGURED`
5. Revisions require reason + `KNOCKOUT_PAIRINGS_REVISED` (before bracket generation only)

Without confirmed pairings, `generateKnockoutBracket()` returns `KNOCKOUT_PAIRINGS_NOT_CONFIGURED`.

Seeding methodology beyond manual pairing: **PENDING PRODUCT DECISION**

---

## Bracket generation (IMPLEMENTED)

`generateKnockoutBracket(tournamentId)`:

1. Validates readiness
2. Requires confirmed pairings
3. Creates 31 matches with dependency wiring
4. R32 matches start `ready` with known participants
5. Later rounds use `slot_*_type = match_winner` + `depends_on_match_*`
6. Idempotent via `tournaments.knockout_bracket_status`
7. Audit: `KNOCKOUT_BRACKET_GENERATED`

---

## Match dependencies & progression (IMPLEMENTED)

Winner of source match fills dependent slot.

Example:

R32 Match 1 winner → R16 Match 1 Slot A  
R32 Match 2 winner → R16 Match 1 Slot B

`recordKnockoutMatchResult()` advances winners and evaluates round completion.

Draw → `requires_resolution` / `MATCH_REQUIRES_RESOLUTION` (tie-break **PENDING PRODUCT DECISION**).

---

## Result corrections (IMPLEMENTED)

Reuse `match_result_corrections`.

If downstream match already progressed: `DOWNSTREAM_CONFLICT` — no silent rewrite.

---

## Disputes & forfeits (IMPLEMENTED)

Reuse existing dispute / forfeit operations.

Knockout forfeits advance the non-forfeiting participant through the same progression path.

No-show / disconnect automation: **PENDING PRODUCT DECISION**

---

## Grand Final & champion (IMPLEMENTED)

On authoritative Grand Final winner:

- `tournaments.champion_participant_id` set
- `tournaments.status = completed`
- `knockout_bracket_status = completed`
- Audits: `CHAMPION_RECORDED`, `TOURNAMENT_COMPLETED`

Prize fulfilment: **out of scope** (not automated).

Public champion projection may expose tournament name, status, champion public code (`KG926-P####`) only.

---

## Scheduling (PENDING PRODUCT DECISION)

Boundary: `scheduling: "manual"`.

No automatic date/time/timezone selection.

---

## Admin UI (IMPLEMENTED)

| Route | Purpose |
|-------|---------|
| `/admin/tournaments/[id]` | Knockout progress summary |
| `/admin/tournaments/[id]/knockout` | Pairing, bracket, match cards, champion |

Permission: `tournament:knockout_manage` (SUPER_ADMIN, TOURNAMENT_ADMIN)

---

## Database (IMPLEMENTED)

Migration: `drizzle/0008_knockout_execution.sql`

- `knockout_pairing_sets`, `knockout_pairings`, `knockout_pairing_participants`
- `tournaments.champion_participant_id`, `knockout_bracket_status`, `completed_at`
- `matches.bracket_slot_index`
- Knockout audit event types

Reuses: `matches`, `match_results`, `knockout_rounds`, `tournament_phase_participants`

---

## Open product decisions (PENDING)

1. Exact R32 pairing strategy beyond manual admin pairing  
2. Seeding methodology  
3. Match settings  
4. Match duration  
5. Tie-resolution mechanism  
6. Extra time  
7. Penalties  
8. No-show timing  
9. Disconnect policy  
10. Forfeit policy details  
11. Dispute policy details  
12. Central vs manual scheduling  
13. Public bracket visibility  
14. Public match results visibility  
15. Public gamer tag visibility  
16. Public player photo visibility  
17. Prize fulfilment workflow  
18. Replacement policy  
19. Knockout participant withdrawal handling  

---

## Scope confirmation

**NOT implemented:**

- Automatic / random R32 seeding
- Live eFootball integration
- Public knockout mutation APIs
- Automatic scheduling
- Prize payout automation
- Automated NIN/passport/POSSAP

---

## Related docs

- [QUALIFICATION-SYSTEM.md](./QUALIFICATION-SYSTEM.md)
- [TOURNAMENT-OPERATIONS.md](./TOURNAMENT-OPERATIONS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
