# KG926 Competition Policy — Backend Step 10

**Competition:** KIRAKITAH GAMING 926 (`event-kg926`)  
**Rules version:** `kg926-v1`  
**Date:** August 23, 2026

---

## Overview

Centralized competition policy boundary for KIRAKITAH GAMING 926.

Code: `src/server/tournament/rules/`

| Module | Purpose |
|--------|---------|
| `competition-policy.ts` | FINALIZED vs PENDING catalog |
| `policy-service.ts` | Admin view + append-only history |

Do **not** invent unresolved gameplay rules. Do **not** silently create `kg926-v2`.

---

## FINALIZED PRODUCT RULES

| Rule | Value |
|------|-------|
| Competition name | KIRAKITAH GAMING 926 |
| Game | eFootball Mobile |
| Format | Online 1v1 |
| Commencement | 2026-09-14 |
| Prize | US$100 Grand Prize |
| Qualification entrants | 128 |
| Qualification pods | 32 × 4 |
| Qualification format | single elimination |
| Qualifiers | 32 (KIRAKITAH TOP 32) |
| Knockout format | single elimination |
| Knockout rounds | R32 → R16 → QF → SF → Grand Final |
| R32 pairing | manual |
| Scheduling mode | manual (no auto-scheduler) |
| Result source (ops) | admin |
| Prize fulfilment | admin_manual (no payment gateway) |
| Rules version | kg926-v1 |

---

## PENDING PRODUCT DECISIONS

| Topic | Status |
|-------|--------|
| Match duration | pending |
| Game mode / eFootball settings | pending |
| Squad / team / player restrictions | pending |
| Connection requirements | pending |
| Extra time | pending |
| Penalties | pending |
| Tie resolution | pending (`MATCH_REQUIRES_RESOLUTION`) |
| Knockout seeding methodology | pending |
| No-show timing | pending (no automatic forfeit timer) |
| Disconnect policy | pending |
| Forfeit policy details | pending |
| Dispute window / evidence | pending |
| Replacement policy | pending |
| Minimum rest between matches | pending |
| Public bracket / results / tags / photos | pending |
| Notification delivery | pending (Step 11) |

---

## Policy change security

| Role | Access |
|------|--------|
| SUPER_ADMIN | view + append history snapshot |
| TOURNAMENT_ADMIN | view only |
| REVIEWER | view only |
| SUPPORT | view only |

Changes require reason + confirmation. History is append-only (`competition_policy_history`). Audit: `COMPETITION_POLICY_VIEWED`, `COMPETITION_POLICY_CHANGED`.

Structural FINALIZED rules remain enforced by `parseCompetitionRules` — admins cannot invent seeding algorithms or auto-scheduling via this UI.

---

## Related

- [SCHEDULING-SYSTEM.md](./SCHEDULING-SYSTEM.md)
- [KNOCKOUT-SYSTEM.md](./KNOCKOUT-SYSTEM.md)
- [QUALIFICATION-SYSTEM.md](./QUALIFICATION-SYSTEM.md)
