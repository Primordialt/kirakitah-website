# KG926 Match Scheduling — Backend Step 10

**Competition:** KIRAKITAH GAMING 926  
**Rules version:** `kg926-v1`  
**Date:** August 23, 2026

---

## Overview

**FINALIZED PRODUCT RULE:** scheduling mode is **manual admin scheduling**.

There is **no** automatic scheduling algorithm, no live eFootball start detection, and no automatic no-show timer.

Code: `src/server/tournament/scheduling/scheduling-service.ts`

---

## Operations

| Operation | Permission | Behavior |
|-----------|------------|----------|
| `scheduleMatch` | `tournament:match_schedule` | Assign date/time/IANA timezone (+ optional window) |
| `rescheduleMatch` | `tournament:match_schedule` | New schedule + reason + audit |
| `cancelMatchSchedule` | `tournament:match_schedule` | Clear schedule + reason + audit |

### Validation

- Match exists; not completed/forfeited/cancelled
- Both participants resolved and distinct
- Valid ISO datetime
- Valid IANA timezone
- Scheduling mode configured (`manual`) else `MATCH_RULES_NOT_CONFIGURED`
- Exact-time participant conflict → `PLAYER_SCHEDULE_CONFLICT`

**PENDING:** minimum rest period between matches (not invented — no buffer).

---

## Match schedule fields

On `matches`:

- `scheduled_at`
- `timezone`
- `scheduled_window_start` / `scheduled_window_end`
- `scheduling_status` (`unscheduled` · `scheduled` · `reschedule_requested` · `cancelled`)
- `scheduled_by`
- `schedule_updated_at`
- `schedule_cancel_reason`

Match lifecycle status (`ready` / `completed` / etc.) remains separate from scheduling status.

---

## Admin UI

`/admin/tournaments/[id]/knockout` — each match card includes Schedule / Reschedule / Cancel Schedule.

API:

- `GET/POST /api/admin/matches/[matchId]` (actions: `schedule`, `reschedule`, `cancel_schedule`)

---

## Notifications

Boundary only (`describeNotificationBoundary`). **No** real email/SMS in Step 10.

---

## Related

- [COMPETITION-POLICY.md](./COMPETITION-POLICY.md)
- [KNOCKOUT-SYSTEM.md](./KNOCKOUT-SYSTEM.md)
