# Account deletion

## Participant accounts

**Model:** soft delete via deactivate + anonymize (no hard row deletion).

**Why:** applications, tournament participants, matches, and audit events
reference participant/application data. Hard deletion would break tournament
integrity.

### Behavior

1. Require confirmation string `DELETE`
2. Block if linked to a **selected** `tournament_participants` row
3. Set `participant_accounts.active = false`
4. Anonymize email/username to unique deleted placeholders
5. Replace password hash with an unusable value
6. Clear profile PII fields
7. Revoke sessions + password-reset tokens
8. Detach `registration_applications.participantAccountId`
9. Audit `PARTICIPANT_ACCOUNT_DELETED` (no passwords/OTP/PII)

User-facing result: “Your account has been deleted.”  
Login fails because `active` is false (existing login gate).

### Endpoints

- Participant self-delete: `POST /api/participant/account/delete`
- SUPER_ADMIN: `POST /api/admin/participants/[accountId]/delete` (`participant:delete`)

## Admin accounts

**Model:** soft delete via deactivate + anonymize (`ADMIN_DELETED` audit).

### Protections

- Only SUPER_ADMIN (`admin:manage`) may delete administrators
- Cannot delete the last active SUPER_ADMIN
- Server-side enforcement (not UI-only)

## RBAC

| Capability | SUPER_ADMIN | others |
|---|---|---|
| Delete participant | YES (`participant:delete`) | NO |
| Delete admin | YES (`admin:manage`) | NO |

## Migration

- **No participant-account schema migration** — uses existing `active` + anonymization.
- **0020** (`0020_admin_deleted_audit_event`) adds `ADMIN_DELETED` to the admin audit event enum.
  Not applied to Production in this PR.
