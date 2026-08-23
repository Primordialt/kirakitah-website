# Production environment matrix — KIRAKITAH GAMING 926

Never commit real secrets. Configure values in Vercel / Neon dashboards only.

## Legend

| Mark | Meaning |
|------|---------|
| R | Required for that environment’s intended registration behavior |
| O | Optional |
| S | Server-only (never `NEXT_PUBLIC_`) |
| P | Public (browser-visible) |

## Matrix

| Variable | Kind | DEVELOPMENT | PREVIEW | PRODUCTION |
|----------|------|-------------|---------|------------|
| `NEXT_PUBLIC_SITE_URL` | P | O (localhost default) | R | R |
| `NEXT_PUBLIC_DATA_SOURCE` | P | `mock` (default) | `mock` or `api` | **must be `api`** (also forced when `VERCEL_ENV=production`) |
| `DATABASE_URL` | S | O (needed for API mode) | O / R if API | **R** |
| `BLOB_READ_WRITE_TOKEN` | S | O | O / R if API | **R** |
| `REGISTRATION_PII_ENCRYPTION_KEY` | S | O | O / R if API | **R** |
| `EMAIL_VERIFICATION_PROVIDER` | S | `mock` | `mock` or `http` | **`http`** |
| `EMAIL_VERIFICATION_API_URL` | S | — | if http | **R** for launch |
| `EMAIL_VERIFICATION_API_KEY` | S | — | if http | **R** for launch |
| `PHONE_VERIFICATION_PROVIDER` | S | `mock` | `mock` or `http` | **`http`** |
| `PHONE_VERIFICATION_API_URL` | S | — | if http | **R** for launch |
| `PHONE_VERIFICATION_API_KEY` | S | — | if http | **R** for launch |
| `ADMIN_AUTH_PROVIDER` | S | `mock` | `mock`/`http`/`unavailable` | **`http`** (mock blocked) |
| `ADMIN_SESSION_SECRET` | S | O | if http | **R** for admin |
| `ADMIN_AUTH_API_URL` | S | — | if http | **R** for admin |
| `ADMIN_AUTH_API_KEY` | S | — | if http | **R** for admin |
| `NIN_VERIFICATION_*` | S | O (unused on submit) | O | O — **not used**; identity is manual |
| `VERCEL_ENV` | S | unset | `preview` | `production` (set by Vercel) |

## Fail-closed rules

- Production must **not** use `NEXT_PUBLIC_DATA_SOURCE=mock`.
- Production must **not** use mock email, SMS, registration, or admin auth.
- Missing email/SMS/admin providers → controlled unavailable / readiness **FAIL** (no silent pretend success).
- Identity remains **manual review** (`provider = manual`). No POSSAP / paid NIN lookup on submit.

## Launch gate

Mandatory for `REGISTRATION_READY`:

1. DATABASE
2. BLOB
3. PII ENCRYPTION
4. REAL EMAIL PROVIDER (`http` + credentials)
5. REAL SMS PROVIDER (`http` + credentials)
6. PRODUCTION DATA SOURCE (`api`)
7. SECURE ADMIN AUTH (`http` + session secret + credentials)
8. LATEST DB MIGRATIONS (through `0010`)

Inspect: `GET /api/admin/system/readiness` (authenticated).
