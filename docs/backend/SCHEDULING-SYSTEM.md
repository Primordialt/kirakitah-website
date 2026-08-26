# KG926 Match Scheduling — Backend Step 10

**Competition:** KIRAKITAH GAMING 926  
**Rules version:** `kg926-v1`

---

## Overview

**FINALIZED PRODUCT RULE:** scheduling mode is **manual admin scheduling**.

There is **no** automatic scheduling algorithm, no live eFootball start detection, and no automatic no-show timer.

Primary docs: [MATCH-SCHEDULING.md](./MATCH-SCHEDULING.md)

Code:

- `src/server/tournament/scheduling/scheduling-service.ts`
- `src/server/tournament/scheduling/notification-service.ts`
- `src/server/tournament/scheduling/schedule-dashboard.ts`
- `src/server/tournament/scheduling/player-match-projection.ts`

---

## Operations

| Operation | Permission | Behavior |
|-----------|------------|----------|
| `scheduleMatch` | `tournament:match_schedule` | Assign date/time/IANA timezone (+ optional window) |
| `rescheduleMatch` | `tournament:match_schedule` | New schedule + reason + history + notification event |
| `cancelMatchSchedule` | `tournament:match_schedule` | Clear schedule + reason + history + notification event |

### Validation

- Match exists; belongs to tournament; not completed/forfeited/cancelled
- Both participants resolved and distinct
- Valid ISO datetime; end after start when supplied
- Valid IANA timezone (display default **Africa/Lagos**)
- Scheduling mode configured (`manual`) else `MATCH_RULES_NOT_CONFIGURED`
- Overlapping participant window → `PLAYER_SCHEDULE_CONFLICT`

**PENDING:** minimum rest period between matches (not invented — no buffer).

---

## Match schedule fields

On `matches` (migration `0009`):

- `scheduled_at`
- `timezone`
- `scheduled_window_start` / `scheduled_window_end`
- `scheduling_status` (`unscheduled` · `scheduled` · `reschedule_requested` · `cancelled`)
- `scheduled_by`
- `schedule_updated_at`
- `schedule_cancel_reason`

Append-only history + notification rows: migration `0015`.

Match lifecycle status (`ready` / `completed` / etc.) remains separate from scheduling status.

---

## Admin UI

| Route | Purpose |
|-------|---------|
| `/admin/tournaments/[id]/schedule` | TODAY / UPCOMING / UNSCHEDULED / RECENTLY RESCHEDULED |
| Pod detail + knockout match cards | `MatchSchedulePanel` Schedule / Reschedule + history |

API: `GET`/`POST` `/api/admin/matches/[matchId]` (`schedule` · `reschedule` · `cancel_schedule`; GET returns history + notification events)

---

## Notifications

Internal/in-app `recorded` only. Email/SMS deferred. Never claim `delivered` without a provider.

---

## Player projection

`getPlayerSafeUpcomingMatch` — privacy-safe. Authenticated participant access is a follow-up (do not invent weak public-code unlocks).

---

## Pending product decisions

Match duration, kickoff, no-show, disconnect, forfeit, dispute, tie-break, extra time, penalties, replay, match settings remain **PENDING**.
