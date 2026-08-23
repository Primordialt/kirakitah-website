# Production environment matrix — KIRAKITAH GAMING 926

Never commit real secrets. Configure values only in Vercel / Neon dashboards.

Authoritative variable names come from `src/server/env.ts`, `src/config/data-source.ts`, and `src/lib/site-url.ts`.

## Legend

| Mark | Meaning |
|------|---------|
| P | Public (`NEXT_PUBLIC_*` — browser-visible) |
| S | Server-only (never prefix with `NEXT_PUBLIC_`) |
| R | Required for that environment’s intended registration behavior |
| O | Optional |
| — | Not used / leave unset |

## Definitive matrix

| NAME | CLIENT/SERVER | DEVELOPMENT | PREVIEW | PRODUCTION | PURPOSE | FAILURE BEHAVIOR | CURRENT STATUS |
|------|---------------|-------------|---------|------------|---------|------------------|----------------|
| `NEXT_PUBLIC_SITE_URL` | P | O (localhost fallback) | R | R | Canonical / OG / sitemap base URL | Falls back to `https://$VERCEL_URL` or localhost | Configure per deploy |
| `NEXT_PUBLIC_DATA_SOURCE` | P | `mock` (default) | `mock` or `api` | **must be `api`** (also forced when `VERCEL_ENV=production`) | Registration client uses API vs mock | Production never uses mock | Must set `api` for Production |
| `DATABASE_URL` | S | O (needed for API mode) | O / R if API | **R** | Neon PostgreSQL | Registration APIs return `CONFIGURATION_UNAVAILABLE` | External |
| `BLOB_READ_WRITE_TOKEN` | S | O | O / R if API | **R** | Private Vercel Blob photos | Registration APIs 503 / upload fails | External |
| `REGISTRATION_PII_ENCRYPTION_KEY` | S | O | O / R if API | **R** | AES-256-GCM for identity numbers + uniqueness pepper | Registration APIs 503; invalid format → readiness ERROR | External — 64 hex chars |
| `EMAIL_VERIFICATION_PROVIDER` | S | `mock` default | `mock` or `http` | **`http`** (mock blocked) | Select email delivery backend | Missing/incomplete → unavailable delivery | EMAIL DELIVERY = BLOCKED |
| `EMAIL_VERIFICATION_API_URL` | S | — | if http | **R** for launch | HTTP email webhook URL | Unavailable provider | External |
| `EMAIL_VERIFICATION_API_KEY` | S | — | if http | **R** for launch | Bearer token for email HTTP API | Unavailable provider | External |
| `PHONE_VERIFICATION_PROVIDER` | S | `mock` default | `mock` or `http` | **`http`** (mock blocked) | Select SMS delivery backend | Missing/incomplete → unavailable delivery | SMS DELIVERY = BLOCKED |
| `PHONE_VERIFICATION_API_URL` | S | — | if http | **R** for launch | HTTP SMS webhook URL | Unavailable provider | External |
| `PHONE_VERIFICATION_API_KEY` | S | — | if http | **R** for launch | Bearer token for SMS HTTP API | Unavailable provider | External |
| `ADMIN_AUTH_PROVIDER` | S | `mock` default | `mock` / `http` / `unavailable` | **`http`** (mock blocked on Vercel Production) | Admin login provider selection | Unavailable / forbidden | ADMIN AUTH = BLOCKED |
| `ADMIN_SESSION_SECRET` | S | O (may fall back to PII key in dev) | R if admin | **R** for admin | HMAC session cookie signing | Auth fails closed | Prefer dedicated secret |
| `ADMIN_AUTH_API_URL` | S | — | if http | Required when HTTP auth implemented | Future HTTP/OIDC backend | Stub still throws not enabled | PENDING PROVIDER |
| `ADMIN_AUTH_API_KEY` | S | — | if http | Required when HTTP auth implemented | Future HTTP/OIDC credential | Stub still throws not enabled | PENDING PROVIDER |
| `NIN_VERIFICATION_PROVIDER` | S | O | O | O — **unused on submit** | Architectural only | N/A for launch | Manual identity only |
| `NIN_VERIFICATION_API_URL` | S | O | O | O — unused on submit | Architectural only | N/A | Do not enable for launch |
| `NIN_VERIFICATION_API_KEY` | S | O | O | O — unused on submit | Architectural only | N/A | Do not enable for launch |
| `VERCEL_ENV` | S | unset | `preview` (auto) | `production` (auto) | Distinguishes strict production fail-closed | Set by Vercel | Platform-managed |
| `VERCEL_URL` | S | — | auto | auto | Fallback site URL host | Used only if site URL unset | Platform-managed |
| `NODE_ENV` | S | `development` | `production` | `production` | Runtime mode | Set by Next/Vercel | Platform-managed |

## Environment rules

### DEVELOPMENT

- Mocks allowed for registration, email, SMS, admin auth.
- App must build without production secrets.
- Default `NEXT_PUBLIC_DATA_SOURCE=mock`.

### PREVIEW (`VERCEL_ENV=preview`)

- Mocks allowed when explicitly configured.
- May use real Neon/Blob for integration testing if Product Owner chooses.
- Do not treat Preview as Production launch proof.

### PRODUCTION (`VERCEL_ENV=production`)

**NO MOCK PROVIDERS.**

Required before public registration:

1. `NEXT_PUBLIC_DATA_SOURCE=api`
2. `DATABASE_URL`
3. `BLOB_READ_WRITE_TOKEN`
4. `REGISTRATION_PII_ENCRYPTION_KEY` (valid 64 hex)
5. Real email HTTP provider env
6. Real SMS HTTP provider env
7. Real admin authentication (currently blocked — HTTP stub not enabled)
8. Migrations through `0010`

## Launch gate

Authoritative check: authenticated `GET /api/admin/system/readiness`

Statuses: `CONFIGURED` | `NOT_CONFIGURED` | `ERROR` | `PENDING_PRODUCT_DECISION`

Gate: `REGISTRATION_READY` only when every **required** check is `CONFIGURED`.
