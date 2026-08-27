# KG926 Launch Readiness

Evidence-based status for KIRAKITAH GAMING 926 participant operations.
Generated for the launch-communications phase. **Do not treat as Production
deployed** until Production verification is completed outside Cursor.

| Area | Status | Evidence / notes |
|---|---|---|
| REGISTRATION | PARTIAL | Account → email OTP (Resend) → username → password → dashboard exists. Duplicate email blocked before OTP (migration 0019). Controlled end-to-end not re-run against Production in this phase. |
| PROFILE | READY | Profile completion server-authoritative; participants cannot self-verify; admin approve / needs_correction with public-safe reason. |
| APPLICATION | READY | Profile verified gate, preflight, wizard, duplicate application + eFootball uniqueness (0019 preserved). Success page remains authoritative. |
| ELIGIBILITY | PARTIAL | Existing eligibility engine + participant-safe wording (ELIGIBLE / ELIGIBILITY PENDING). No eligibility email — deferred (no discrete participant-safe email workflow beyond portal projection). |
| IDENTITY | PARTIAL | Manual identity review remains admin-authoritative. No new participant identity-outcome email in this phase. |
| SOCIAL | PARTIAL | Social follow review remains existing admin flow. No new social-outcome email. |
| REVIEW | PARTIAL | Application review queue/ops exist. Application-level review-outcome email and application-level request-changes remain **DEFERRED** (intentionally out of scope; no clean participant-visible outcome email path). |
| SELECTION | READY | Authoritative `selectParticipant` only. Email + in-app audit only when `alreadySelected === false`. REVIEWER cannot select (RBAC unchanged). |
| QUALIFICATION | PARTIAL | Pod assignment emits in-app `PARTICIPANT_QUALIFICATION_ASSIGNED` with pod number. Qualification email deferred (in-app sufficient; avoid expanding email surface). Competition rules unchanged. |
| MATCHES | PARTIAL | Existing `MATCH_*` in-app events reused. Opponent projections remain player-safe. Match **email** delivery remains deferred (`channel: "internal"`). |
| RESULTS | PARTIAL | Result recording + player-safe projections exist. No new result email; in-app remains match-event based where recorded. |
| NOTIFICATIONS | PARTIAL | In-app merges lifecycle audit + match events; grouped UI; deep links. Read/unread **DEFERRED** (no schema). Match reminder scheduler **DEFERRED**. SMS **DEFERRED**. |
| PASSWORD RECOVERY | BLOCKED / UNVERIFIED | Code path exists (forgot → email → reset → sessions revoked). Production migration **0018** status cannot be verified from Cursor — treat Production as blocked until confirmed. |
| ACCOUNT DELETION | READY | Participant self-delete + SUPER_ADMIN participant/admin deletion with last SUPER_ADMIN protection (prior phase). Unchanged this phase. |
| RBAC | READY | No RBAC changes this phase. REVIEWER lacks selection. Boundaries preserved by audit. |
| SECURITY | READY | Lifecycle emails reuse server-only Resend; no `NEXT_PUBLIC_RESEND_API_KEY`; OTP/reset tokens not logged; email failure does not mutate authoritative state. |
| MOBILE | PARTIAL | Notification + dashboard patterns remain mobile-first. Full device matrix not re-measured in this phase. |
| ACCESSIBILITY | PARTIAL | Semantic groupings, textual status, focusable links preserved. Target Accessibility 100 — not re-scored with Lighthouse in this phase. |
| PERFORMANCE | PARTIAL | No new polling or heavy deps. Lighthouse/PSI not claimed (may be quota-blocked). |

## Notification matrix (audit)

| Event | In-app | Email | Status |
|---|---|---|---|
| Email verified | none (auth flow) | OTP email (existing) | existing |
| Profile submitted | none (noise) | none | intentional |
| Profile verified | audit → notifications | lifecycle email | implemented |
| Profile correction required | audit → notifications | lifecycle email | implemented |
| Application received | audit → notifications | lifecycle email | implemented |
| Application review outcome | none | none | **DEFERRED** — no clean participant-visible application outcome email |
| Eligibility outcome | portal projection | none | portal only; email **DEFERRED** |
| Selection | audit → notifications | lifecycle email | implemented (authoritative only) |
| Non-selection | none | none | **DEFERRED** — no authoritative non-selection event |
| Qualification assignment | audit → notifications | none | in-app implemented; email **DEFERRED** |
| Match scheduled | `MATCH_SCHEDULED` | none | in-app existing; email **DEFERRED** |
| Match rescheduled | `MATCH_RESCHEDULED` | none | in-app existing; email **DEFERRED** |
| Match reminder | `MATCH_REMINDER` type | none | **DEFERRED** — no reliable scheduler |
| Match cancelled | `MATCH_CANCELLED` | none | in-app existing; email **DEFERRED** |
| Result recorded | via match projections / existing events | none | email **DEFERRED** |

## Deferred (why)

1. **Application review-outcome email / application-level request-changes** — earlier architecture decision; no inventing application `needs_correction`.
2. **Eligibility email** — portal wording sufficient; avoid implying selection via mail.
3. **Non-selection email** — no authoritative non-selection event.
4. **Qualification / match / result emails** — match notification service still records `channel: "internal"`; connecting Resend requires careful opponent-safe templates + idempotency; deferred to avoid unsafe expansion.
5. **Match reminder scheduler** — no reliable cron/queue in repo; do not fake reminders.
6. **SMS** — product deferred.
7. **Read/unread notification state** — not in schema; do not invent large read-state system.
8. **Email retry queue** — Resend provider returns unavailable on failure; no complex queue this phase.
9. **Production password-reset readiness** — migration 0018 Production apply status unverified from Cursor.

## Database

**No migration required** for this phase.

Lifecycle communications reuse `participant_audit_events` and existing email delivery. Match events reuse `match_notification_events`.

## Production

- Production deployed: **NO**
- Production data mutated: **NO**
- Production migration applied: **NO**

KIRAKITAH  
PLAY. COMPETE. CREATE.
