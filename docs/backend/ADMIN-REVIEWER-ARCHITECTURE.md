# Admin Reviewer Architecture — Step 5

**Status:** IMPLEMENTED (auth provider pending for production)  
**Branch:** `development`

---

## Overview

Secure internal administration for KIRAKITAH GAMING 926 registration review.

| Area | Status |
|------|--------|
| Admin auth abstraction | IMPLEMENTED |
| Mock admin auth | MOCKED (dev/test only) |
| Production admin auth provider | PENDING PROVIDER |
| Roles / permissions | IMPLEMENTED |
| Protected admin APIs | IMPLEMENTED |
| Admin UI | IMPLEMENTED |
| Identity review workflow | IMPLEMENTED (manual) |
| Application status transitions | IMPLEMENTED |
| Audit trail | IMPLEMENTED |
| Tournament management | FUTURE (not in Step 5) |

Identity verification remains **manual**. No NIN API, passport API, or POSSAP calls.

---

## Authentication

| Provider | Environments |
|----------|--------------|
| `MockAdminAuthProvider` | development / test only |
| `HttpAdminAuthProvider` | stub — PENDING PROVIDER |
| `UnavailableAdminAuthProvider` | production fail-closed default |

Sessions:

- HttpOnly cookie `kirakitah_admin_session`
- HMAC-signed payload
- Secure flag in production
- SameSite=Lax
- 8-hour TTL
- Never stored in localStorage

`ADMIN_SESSION_SECRET` (falls back to `REGISTRATION_PII_ENCRYPTION_KEY` when unset).

---

## Authorization

Roles: `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `REVIEWER`, `SUPPORT`

Permissions are explicit (see `src/server/admin/authorization/permissions.ts`).

Server-side enforcement on every admin API and page data load.

---

## Admin routes (UI)

| Path | Purpose |
|------|---------|
| `/admin` | Dashboard stats |
| `/admin/login` | Dev auth entry (blocked in production without provider) |
| `/admin/applications` | Paginated list + filters |
| `/admin/applications/[referenceId]` | Detail + review actions |
| `/admin/reviews/identity` | Pending identity queue |
| `/admin/audit` | Append-only audit log |

No public navigation links. `robots.txt` disallows `/admin` and `/api/admin`.

---

## Admin APIs

All require authenticated session + permission + CSRF (Origin/Referer) on mutations.

| Method | Path |
|--------|------|
| POST | `/api/admin/auth/login` |
| POST | `/api/admin/auth/logout` |
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/applications` |
| GET | `/api/admin/applications/[referenceId]` |
| POST | `/api/admin/applications/[referenceId]/identity-review` |
| POST | `/api/admin/applications/[referenceId]/status` |
| POST | `/api/admin/applications/[referenceId]/identity/reveal` |
| GET | `/api/admin/applications/[referenceId]/photo` |
| GET | `/api/admin/reviews/identity` |
| GET | `/api/admin/audit` |

Responses: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`.

---

## Identity review

```text
pending_review → verified (approved)
pending_review → rejected
```

- Notes required on reject
- Confirmation required in UI for reject
- Conditional DB update for concurrency conflicts (409)
- **Does NOT** change application status

---

## Application status

```text
received → under_review → verified | rejected
received | under_review → withdrawn
```

Terminal statuses cannot transition further in this step.

---

## Sensitive data

| Data | Permission | Behaviour |
|------|------------|-----------|
| Identification number | `identity:reveal` | Masked by default; explicit reveal + audit |
| Guardian | `guardian:view` | Omitted otherwise |
| Player photo | `photo:view` | Private blob streamed via authenticated route |

---

## Audit events

Append-only `admin_audit_events`:

- `ADMIN_LOGIN`
- `IDENTITY_REVIEW_APPROVED` / `REJECTED`
- `APPLICATION_STATUS_CHANGED`
- `SENSITIVE_IDENTITY_VIEWED`
- `GUARDIAN_DATA_VIEWED`
- `PLAYER_PHOTO_VIEWED`

Never stores NIN, passport, OTP, email, phone, or guardian contacts.

---

## Database

Migration: `drizzle/0004_admin_reviewer.sql`

- `admin_users`
- `admin_audit_events`
- role + audit enums

---

## Production safeguards

- Mock admin auth cannot run in production
- Unauthenticated `/api/admin/*` → 401
- Unauthenticated `/admin/*` → redirect login
- No public admin links
- No automated identity verification
