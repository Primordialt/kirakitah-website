# Admin authentication setup — KIRAKITAH GAMING 926

**Status: ADMIN AUTH = BLOCKED**

Production must not use mock admin authentication.

The repository includes an HTTP/OIDC **stub** (`HttpAdminAuthProvider`) that still throws:

> HTTP admin authentication is not yet enabled.

Setting `ADMIN_AUTH_API_URL` / `ADMIN_AUTH_API_KEY` alone does **not** enable login and does **not** make the launch gate report admin as `CONFIGURED`.

Constant: `HTTP_ADMIN_AUTH_IMPLEMENTED = false` in `src/server/registration/launch-readiness.ts`.

Do not invent an OIDC vendor or callback URLs here. Product Owner chooses the identity provider; engineering then implements against the existing abstraction.

## Existing abstractions

| Piece | Location | Behavior |
|-------|----------|----------|
| `AdminAuthProvider` | `src/server/admin/auth/types.ts` | `authenticate(credentials) → AdminUser` |
| Mock provider | `MockAdminAuthProvider` | Dev/CI only; blocked on Vercel Production |
| Unavailable provider | `UnavailableAdminAuthProvider` | Fail closed |
| HTTP stub | `HttpAdminAuthProvider` | Requires URL+key env, still not enabled |
| Sessions | `src/server/admin/auth/session.ts` | HMAC-signed cookie, 8h TTL |
| CSRF | `assertAdminCsrf` | Origin/Referer host match for mutations |
| RBAC | `src/server/admin/authorization/permissions.ts` | Role → permission matrix |

## Environment variables (actual names)

| Variable | Purpose |
|----------|---------|
| `ADMIN_AUTH_PROVIDER` | `mock` \| `http` \| `unavailable` — Production defaults toward unavailable/http, never mock |
| `ADMIN_SESSION_SECRET` | HMAC secret for session cookies (prefer dedicated; do not reuse casually) |
| `ADMIN_AUTH_API_URL` | Future HTTP auth backend URL |
| `ADMIN_AUTH_API_KEY` | Future HTTP auth backend key |

## Session / cookie behavior (current)

- Cookie: httpOnly, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, path `/`
- TTL: 8 hours
- Payload includes admin id, email, display name, role, active flag
- If `ADMIN_SESSION_SECRET` is missing, code may fall back to `REGISTRATION_PII_ENCRYPTION_KEY` — **Production should set a dedicated `ADMIN_SESSION_SECRET`**

## Initial admin provisioning / roles

Roles: `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `REVIEWER`, `SUPPORT`.

Production provisioning depends on the chosen IdP + future `HttpAdminAuthProvider` implementation (and/or `admin_users` table from migration `0004`). Until that lands, Production admin login must remain fail-closed.

## Failure behavior

- Mock on Production → forbidden / unavailable
- HTTP stub → authentication error even with credentials present
- Readiness: `ADMIN_AUTH` = `NOT_CONFIGURED` (required) → gate stays `REGISTRATION_NOT_READY`

## What Product Owner must supply

1. Chosen identity provider / SSO approach
2. Allowed admin email domains / user list
3. Initial role assignments
4. Callback / redirect requirements (if OIDC)
5. Decision that engineering may implement the real `HttpAdminAuthProvider` path and flip `HTTP_ADMIN_AUTH_IMPLEMENTED` only after tested
