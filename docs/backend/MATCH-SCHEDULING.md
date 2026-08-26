# Match Scheduling — KIRAKITAH GAMING 926

Operational scheduling layer for tournament matches. Does **not** finalize competition policies (duration, kickoff, no-show, disconnect, forfeit, dispute, tie-break, ET, penalties, replay, match settings).

## Model

Scheduling fields live **on `matches`** (migration `0009`):

| Field | Purpose |
| --- | --- |
| `scheduled_at` | Kickoff (UTC storage) |
| `scheduled_end_at` | Optional end (UTC) |
| `timezone` | Display/operating zone (`Africa/Lagos`) |
| `scheduled_by` | Admin actor |
| `scheduling_status` | `UNSCHEDULED` / `SCHEDULED` / `RESCHEDULED` / `CANCELLED` |

Append-only history: **`match_schedule_history`** (migration `0015`).

In-app notification records: **`match_notification_events`** (migration `0015`). Email/SMS remain deferred.

## Timezone

- Tournament operating timezone: **Africa/Lagos**
- Store timestamps in UTC
- Admin UI displays e.g. `14 Sep 2026, 6:00 PM WAT`
- Do not treat browser-local time as tournament time without labelling Lagos/WAT

## Lifecycle

1. Match created → `scheduling_status = UNSCHEDULED`
2. Schedule → `SCHEDULED` + history row + `MATCH_SCHEDULED` notification (`recorded`)
3. Reschedule → `RESCHEDULED` + history + `MATCH_RESCHEDULED` notification
4. Cancel schedule → `CANCELLED` + history + `MATCH_CANCELLED` notification
5. Completed/resolved matches: history visible; reschedule **blocked**

Scheduling never writes results, winners, standings, pod completion, or Top 32 advancement.

## Conflicts

Only **direct overlapping windows** for the same participant are detected.

Message: *This participant is already scheduled for another match during this time.*

No mandatory rest period is invented.

## Admin UI

| Route | Purpose |
| --- | --- |
| `/admin/tournaments/[id]/schedule` | TODAY / UPCOMING / UNSCHEDULED / RECENTLY RESCHEDULED |
| Pod detail + knockout match cards | Schedule / Reschedule + history |

Filters: date, phase, pod, scheduled flag, match status.

## Player projection

`getPlayerSafeUpcomingMatch` exposes public code, gamer tags, phase/pod/round, schedule, match status.

**Does not** expose email, phone, NIN, passport, guardian, private socials, photos, admin notes.

Authenticated participant access is a **follow-up** — do not use public-code query params or DOB unlocks.

`UpcomingMatchCard` is read-only for players.

## Notifications (MVP)

| Event | Channel | Delivery status |
| --- | --- | --- |
| `MATCH_SCHEDULED` | `internal` | `recorded` |
| `MATCH_RESCHEDULED` | `internal` | `recorded` |
| `MATCH_REMINDER` | reserved | — |
| `MATCH_CANCELLED` | `internal` | `recorded` |

Do not claim `delivered` without a real provider. Email/SMS deferred.

## RBAC

| Action | Roles |
| --- | --- |
| Schedule / reschedule / cancel | `SUPER_ADMIN`, `TOURNAMENT_ADMIN` |
| View schedule board | `tournament:view` (incl. REVIEWER) |
| SUPPORT | no scheduling mutation |

Enforced server-side via `tournament:match_schedule`.

## Audit

- `MATCH_SCHEDULED`
- `MATCH_RESCHEDULED`
- `MATCH_SCHEDULE_CANCELLED`
- `MATCH_NOTIFICATION_CREATED`

Metadata: match/tournament IDs, phase, pod, public codes, old/new schedule, reason category. No PII.

## Pending product decisions

- Match duration / default end window
- Kickoff / no-show / disconnect / forfeit / dispute / tie-break / ET / penalties / replay / settings

Display: *Policy pending final tournament rules.* when those concepts appear.

## Migrations

| Migration | Purpose |
| --- | --- |
| `0009` | Scheduling columns + enums on matches |
| `0015` | Schedule history + notification events + `MATCH_NOTIFICATION_CREATED` audit |

Apply via operator `npm run db:migrate` after deploy. Do not apply from Cursor against Production.
