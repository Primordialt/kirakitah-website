# Admin operations — KIRAKITAH GAMING 926

Operational guide for registration review through participant selection.

## Lifecycle (do not collapse)

```text
APPLICATION RECEIVED
  → IDENTITY REVIEW
  → SOCIAL REVIEW (X + Instagram + TikTok)
  → APPLICATION STATUS / APPROVAL
  → ELIGIBILITY (kg926-v3)
  → PARTICIPANT SELECTION (manual)
  → QUALIFICATION (manual pods)
```

Application approval **does not** create a participant, assign a pod, or create matches.

## Role responsibilities

### SUPER_ADMIN

- Manage administrators (`/admin/users`)
- Full application, identity, social, eligibility, and tournament permissions
- Bootstrap recovery via `npm run admin:create` if required

### TOURNAMENT_ADMIN

- Application list/view/status
- Social review
- Eligibility + participant selection and tournament operations
- **Cannot** manage admins or perform identity review/reveal

### REVIEWER

- Application list/view/status
- Identity review (including reveal/photo/guardian where permitted)
- Social review
- Eligibility evaluation view
- **Cannot** manage admins
- **Cannot** select/withdraw/disqualify participants

### SUPPORT

- Limited dashboard / application view / tournament view
- No identity, social, status, or admin management mutations

## Review queues

| Queue | Path | Permission |
|-------|------|------------|
| Identity | `/admin/reviews/identity` | `identity:review` |
| Social | `/admin/reviews/social` | `social:review` |
| Applications | `/admin/applications` | `applications:list` |

## Social requirement

Manual verification of **X**, **Instagram**, and **TikTok** is required before participation.  
Pending → `SOCIAL_FOLLOWING_NOT_VERIFIED`. Rejected → `SOCIAL_FOLLOWING_REJECTED`.

## Administrator provisioning

1. First account: CLI bootstrap (`docs/admin/ADMIN-AUTH.md`)
2. Ongoing: SUPER_ADMIN → `/admin/users/new`
3. Deactivate rather than delete
4. Last active SUPER_ADMIN is protected from deactivation/downgrade

## Related docs

- `docs/admin/ADMIN-AUTH.md`
- `docs/backend/KG926-APPLICATION-REVIEW-WORKFLOW.md`
- `docs/backend/SOCIAL-FOLLOW-ELIGIBILITY.md`
