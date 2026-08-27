# KG926 Application Operations

Operational admin workspace for KIRAKITAH GAMING 926 application processing.

## Workspace entry points

- `/admin` — role-aware **Needs your attention** + counts
- `/admin/applications` — filtered application queue (defaults to KG926 event)
- `/admin/tournaments/[tournamentId]/applications` — same queue scoped to a tournament
- `/admin/applications/[referenceId]` — application detail + review actions
- `/admin/reviews/identity` — pending identity queue
- `/admin/reviews/social` — pending social queue
- `/admin/reviews/profiles` — participant **profile** verification queue (correction reasons live here)

## Application queue

Server-side pagination, filtering, and search:

- Application status: received / under_review / verified / rejected / withdrawn
- Identity status
- Social follow status
- Reference exact match
- Search: reference + eFootball gamer tag (always)
- Elevated PII search (name/email/phone) only when role has `identity:reveal`

List projections include gamer tag and verification statuses. Desktop uses a table;
mobile uses stacked cards.

## Application detail hierarchy

1. Stage summary (Application / Identity / Social / Selection)
2. Review actions (status, identity, social, eligibility panel)
3. Applicant + application details
4. Safe audit history (when `audit:view`)

Identity notes are admin-only and are not projected to participant status cards.

## Review actions

| Action | Permission | Notes |
|---|---|---|
| Start review / Approve / Reject / Withdraw application | `applications:status` | Controlled transitions only |
| Approve / Reject identity | `identity:review` | Manual; does not approve application |
| Social platform review | `social:review` | X / Instagram / TikTok only |
| Eligibility evaluate / select | `tournament:eligibility` / `tournament:participant_select` | Selection remains separate |

## Correction workflow

- **Profile correction** uses `participant_profiles.status = needs_correction` +
  public-safe `correctionReason` (required, ≥8 chars).
- Participant dashboard shows **Action required** with the correction reason.
- Application status has **no** `needs_correction` state. Do not invent one.
- Identity/social rejections store admin review notes; those notes are not shown
  as participant profile correction reasons.

## Eligibility vs selection

Eligibility evaluation uses the existing eligibility engine.
Verified application ≠ selected participant.
REVIEWER does not receive `tournament:participant_select`.

## Notifications

Match notifications continue to use the existing match notification projection.
This phase does **not** add a parallel email/SMS notification system for review events.
Participant feedback for profile correction is delivered through the portal status UI.

## Audit

Reuses `admin_audit_events` / `listAdminAuditEvents` for application history.
No passwords, OTPs, or raw identity numbers are logged in review metadata.

## RBAC preserved

| Role | Applications | Identity | Social | Select | Admin manage |
|---|---|---|---|---|---|
| SUPER_ADMIN | yes | yes | yes | yes | yes |
| TOURNAMENT_ADMIN | yes | masked only | yes | yes | no |
| REVIEWER | yes | yes | yes | no | no |
| SUPPORT | list/view | no | no | no | no |

## KG926 protection

Does not modify `kg926-v3`, social platform requirements, eligibility rules,
selection/qualification engines, or migration 0019 uniqueness.
