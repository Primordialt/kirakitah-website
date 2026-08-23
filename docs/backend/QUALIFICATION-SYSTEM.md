# KG926 Qualification System — Backend Step 8

**Competition:** KIRAKITAH GAMING 926 (`event-kg926`)  
**Rules version:** `kg926-v1`  
**Date:** August 23, 2026

---

## Overview

Backend Step 8 implements the **finalized KG926 qualification engine**:

128 players → 32 pods × 4 positions → single-elimination per pod → 1 qualifier per pod → **KIRAKITAH TOP 32**

This is **not** round-robin, **not** a points table, and **not** pending mechanics.

---

## Status legend

| Label | Meaning |
|-------|---------|
| **FINALIZED PRODUCT RULE** | Approved and implemented |
| **PENDING PRODUCT DECISION** | Boundary documented; not invented |
| **IMPLEMENTED** | Built in Step 8 |
| **FUTURE** | Explicitly out of scope |

---

## Qualification structure (FINALIZED PRODUCT RULE)

```
128 players
    ↓
32 qualification pods (Pod 1 – Pod 32)
    ↓
4 positions per pod (capacity enforced)
    ↓
Single elimination within each pod
    ↓
1 qualifier per pod
    ↓
32 qualifiers → KIRAKITAH TOP 32 (knockout phase)
```

| Constant | Value |
|----------|-------|
| Entrants | 128 |
| Pods | 32 |
| Positions per pod | 4 |
| Qualifiers | 32 |
| Normal matches per pod | 3 (2 semifinals + 1 final) |
| Max qualification matches (normal pods) | 96 |

---

## Pod format (FINALIZED PRODUCT RULE)

Each normal four-player pod:

```
Semifinal 1:  Player A vs Player B
Semifinal 2:  Player C vs Player D
       ↓
Final:        Winner SF1 vs Winner SF2
       ↓
Pod winner → Qualifier
```

Round types (controlled enum): `semifinal` · `final`

No additional qualification rounds.

---

## Database (IMPLEMENTED)

### `qualification_pods`

| Field | Purpose |
|-------|---------|
| `tournament_id` | Parent tournament |
| `phase_id` | Qualification phase |
| `pod_number` | 1–32, unique per tournament |
| `status` | `draft` · `ready` · `active` · `completed` · `cancelled` |
| `capacity` | Default 4 |
| `host_semifinal_index` | 1 or 2 when host occupies a semifinal slot |
| `qualifier_participant_id` | Pod winner |
| `rules_version` | `kg926-v1` |

**Constraints:** unique `(tournament_id, pod_number)`

### `qualification_pod_members`

Links `participant_id` to pod + position (1–4).

**Constraints:**

- unique `(pod_id, position_number)`
- unique `(pod_id, participant_id)`
- unique `(phase_id, participant_id)` — one pod per participant

### `qualification_auto_advancements`

Records host auto-advance events (not fake match scores).

### Extended `matches`

Qualification matches reuse the existing match/result system:

- `qualification_pod_id`
- `qualification_round` (`semifinal` | `final`)
- `semifinal_index` (1 | 2)
- `slot_a_type` / `slot_b_type` (`participant` | `host` | `match_winner`)
- `depends_on_match_a_id` / `depends_on_match_b_id` (final dependencies)
- Nullable `participant_a_id` / `participant_b_id` until resolved

### Extended `match_results`

- `outcome_type`: `played` · `auto_advance` · `requires_resolution`

### Match status

- Added `requires_resolution` for draws pending tie-break decision

---

## Host rule (FINALIZED PRODUCT RULE)

Custom Tournament host occupies a **match slot**, not a pod member position:

- Host consumes one tournament position in the Custom Tournament UI
- Host is **not** a `tournament_participant`
- Host is **not** counted among the four pod players
- When paired against host → opponent **auto-advances** (`auto_advance` outcome)
- No fabricated scores (e.g. 3–0)
- Audit event: `QUALIFICATION_AUTO_ADVANCED` with `reason: HOST_POSITION`

Pods with host may have fewer played matches than a normal 3-match pod.

---

## Pod assignment (IMPLEMENTED)

**Mode:** manual (FINALIZED PRODUCT RULE — no random seeding invented)

Operations:

- `assignParticipantToPod()` — initial assignment
- `reassignParticipantToPod()` — explicit move with reason + audit

Validation:

- Participant must exist and be `selected`
- Not withdrawn / disqualified
- Not already in another pod (without reassignment)
- Pod capacity ≤ 4
- Phase total ≤ 128 participants

**Permission:** `tournament:pod_manage` (TOURNAMENT_ADMIN, SUPER_ADMIN)

---

## Match generation (IMPLEMENTED)

`generateQualificationPodMatches(podId)`:

1. Creates 2 semifinal matches + 1 final (with winner dependencies)
2. Applies host auto-advance if configured
3. Resolves final participants when semifinal winners known
4. Sets pod status `ready` → `active`

Idempotent: repeated calls return existing matches.

---

## Match results (IMPLEMENTED)

`recordQualificationMatchResult()`:

- Validates non-negative integer scores
- Draw → `requires_resolution` status (PENDING PRODUCT DECISION for tie-break)
- Winner progression updates final match participants
- Final winner → `completeQualificationPod()`

Final blocked until both semifinal winners resolved.

Host matches cannot receive manual scores.

---

## Pod completion (IMPLEMENTED)

Pod completed when:

- Required matches resolved
- Final winner recorded as `qualifier_participant_id`
- Audit: `QUALIFICATION_POD_COMPLETED`

Qualification phase complete only when **all 32 pods** have valid qualifiers (`isQualificationPhaseComplete()`).

---

## Top 32 advancement (IMPLEMENTED)

`advancePodWinnerToTop32(podId)`:

- Pod must be `completed` with qualifier
- Participant still eligible
- Creates `tournament_phase_participants` in knockout phase
- Audit: `QUALIFICATION_TOP32_ADVANCED`

Bulk: `advanceAllPodWinnersToTop32()` / `POST .../qualification/advance-top32`

Top 32 derived from pod winners — not hardcoded lists or standings.

---

## Admin UI (IMPLEMENTED)

| Route | Purpose |
|-------|---------|
| `/admin/tournaments/[id]` | Qualification progress dashboard |
| `/admin/tournaments/[id]/qualification` | Pod list + stats |
| `/admin/tournaments/[id]/qualification/pods/[n]` | Pod detail, assignment, matches |

---

## Admin API (IMPLEMENTED)

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/api/admin/tournaments/[id]/qualification` | `tournament:view` |
| GET/POST | `/api/admin/tournaments/[id]/qualification/pods/[n]` | varies by action |
| POST | `/api/admin/tournaments/[id]/qualification/advance-top32` | `tournament:phase_manage` |

All admin-only. No public mutation endpoints.

---

## Audit events (IMPLEMENTED)

- `QUALIFICATION_POD_CREATED`
- `QUALIFICATION_PARTICIPANT_ASSIGNED`
- `QUALIFICATION_PARTICIPANT_REASSIGNED`
- `QUALIFICATION_MATCH_CREATED`
- `QUALIFICATION_MATCH_RESOLVED`
- `QUALIFICATION_AUTO_ADVANCED`
- `QUALIFICATION_POD_COMPLETED`
- `QUALIFICATION_TOP32_ADVANCED`

No PII in metadata.

---

## Concurrency & idempotency (IMPLEMENTED)

- Database unique constraints prevent duplicate pod members
- Conditional updates on pod completion (`status = active`)
- Idempotent assignment, match generation, advancement

Neon HTTP driver: no multi-statement transactions; constraints + conditional logic used.

---

## Public projections (FUTURE)

Architecture supports future public pod/match/result display using `KG926-P####` codes only. Not exposed in Step 8.

---

## Open product decisions (PENDING PRODUCT DECISION)

1. Match tie-resolution mechanism
2. Exact eFootball match settings
3. Match duration
4. Extra time / penalties policy
5. No-show timing
6. Disconnect handling
7. Forfeit policy (qualification-specific)
8. Dispute policy (qualification-specific)
9. Central vs manual match scheduling
10. Random vs seeded vs manual pod assignment (beyond manual default)
11. Top 32 knockout bracket seeding
12. Knockout pairing rules
13. Public visibility of qualification pods
14. Public visibility of standings/results
15. Public gamer tag display
16. Public player photos

---

## Scope confirmation

**NOT implemented:**

- Automated pod assignment / seeding
- Live eFootball integration
- Public qualification UI
- Knockout bracket generation
- Points-based qualification standings as advancement mechanism

---

## Related docs

- [TOURNAMENT-OPERATIONS.md](./TOURNAMENT-OPERATIONS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TOURNAMENT-ELIGIBILITY.md](./TOURNAMENT-ELIGIBILITY.md)
