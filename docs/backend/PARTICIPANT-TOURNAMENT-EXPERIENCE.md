# Participant Tournament Experience — KIRAKITAH

**Status:** Implemented on `development`.  
**Scope:** Read-only participant portal layer consuming existing tournament backend services.

## Architecture

```text
ACCOUNT (participant_accounts)
  ↓
PROFILE (participant_profiles — verified gate)
  ↓
APPLICATION (registration_applications)
  ↓
ELIGIBILITY (eligibility_evaluations — server-evaluated)
  ↓
SELECTION (tournament_participants — admin-selected)
  ↓
QUALIFICATION (qualification_pods / qualification_pod_members)
  ↓
MATCHES (matches + match_results + scheduling)
  ↓
NOTIFICATIONS (match_notification_events — internal channel)
```

Participant account remains **separate** from tournament application. Profile verification unlocks apply; application approval, eligibility, selection, and qualification are distinct backend stages.

## Participant-visible data

| Area | Visible | Hidden |
|------|---------|--------|
| Application | referenceId, lifecycle status, submitted date | email, phone, NIN, passport, guardian, admin notes |
| Identity | coarse status (pending / verified / needs correction) | documents, ID numbers, reviewer notes |
| Social | aggregate + per-platform status (X, Instagram, TikTok) | handles, reviewer notes |
| Eligibility | ELIGIBLE / ELIGIBILITY PENDING summary | internal reason codes (optional future) |
| Selection | selected / withdrawn / disqualified + publicCode | selection reasoning, admin audit |
| Qualification | pod number, position, pod mates by gamer tag / public code | private contact, admin notes |
| Matches | opponent gamer tag / public code, schedule (WAT), result | opponent email, phone, PII |
| Notifications | match schedule/reschedule/cancel events | admin events, internal audit |

## API routes (participant-authenticated)

| Route | Purpose |
|-------|---------|
| `GET /api/participant/tournaments` | Tournament summaries for account |
| `GET /api/participant/tournaments/[tournamentId]` | Full tournament experience |
| `GET /api/participant/tournaments/[tournamentId]/matches` | Match list + upcoming |
| `GET /api/participant/notifications` | Internal notification feed |

All routes require `kirakitah_participant_session`. Ownership enforced via `participant_account_id` on applications.

## Reused backend services (not duplicated)

- `evaluateRegistrationEligibilityByReference` — eligibility
- `formatEligibilitySummary` — eligibility presentation
- `getPlayerSafeUpcomingMatch` — upcoming match projection
- `getPodDetail` — pod roster (public code + gamer tag only)
- `match_notification_events` — notification feed
- Existing application / selection / qualification / scheduling engines unchanged

## UI pages

| Path | Purpose |
|------|---------|
| `/dashboard` | Participant home — profile, tournaments, notifications preview |
| `/tournaments` | My tournaments list |
| `/tournaments/[id]` | Application + eligibility + selection + pod + upcoming match |
| `/tournaments/[id]/apply` | Apply (existing gate) |
| `/matches` | My matches |
| `/notifications` | Notification inbox |
| `/account` | Account summary |
| `/profile` | Profile (existing) |

## Security

- Middleware cookie gate + route-level session verification
- `resolveParticipantTournamentContext` scopes queries to `participant_account_id`
- `assertApplicationOwnedByAccount` for reference-based access
- `assertNoSensitivePublicFields` on projections
- No participant write access to tournament state

## Database

No new migration required for this phase. Uses existing tables:

- `registration_applications`
- `registration_social_follows`
- `tournament_participants`
- `qualification_pod_members`
- `matches`, `match_results`
- `match_notification_events`

## KG926 regression

This layer does **not** modify:

- kg926-v3 eligibility rules
- social platform requirements (X, Instagram, TikTok)
- identity review workflow
- participant selection logic
- qualification mechanics
- match scheduling / result recording

## Production deployment

Code-only deployment. No new Production migration required for participant tournament experience UI/API layer.

If deploying after password recovery PR, ensure migration **0018** is applied separately for reset tokens (unrelated to this feature).
