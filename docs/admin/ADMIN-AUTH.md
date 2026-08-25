# Production admin authentication — KIRAKITAH GAMING 926

Admin authentication uses **database password auth** against `admin_users`.

Email OTP / SMS OTP remain deferred under `MVP_MANUAL_REVIEW`.

## Login flow

1. Admin opens `/admin/login`
2. Submits email + password to `POST /api/admin/auth/login`
3. Server verifies CSRF Origin/Referer
4. `DatabaseAdminAuthProvider` loads the active `admin_users` row
5. Password verified with Node `scrypt` (salted, constant-time compare)
6. HMAC-signed HttpOnly session cookie (`kirakitah_admin_session`, 8 hours)
7. Audit: `ADMIN_LOGIN_SUCCESS`

Failed credentials always return: **Invalid email or password.**

Rate-limited: **Too many sign-in attempts. Please try again later.**

## Password hashing

Format: `scrypt$N$r$p$salt$derived` (base64url)

- N=16384, r=8, p=1, key length 64
- Never log or return hashes
- Minimum password length: 12
- Common passwords rejected at provisioning

## Provisioning the first admin

Apply migration `0011_admin_password_auth` first (`npm run db:migrate`).

In a secure shell with Production `DATABASE_URL`:

```bash
npm ci
set ADMIN_BOOTSTRAP_PASSWORD=your-long-password
npm run admin:create -- --email you@example.com --name "Your Name" --role SUPER_ADMIN
```

- Prefer `ADMIN_BOOTSTRAP_PASSWORD` so the password is never typed into a visible prompt.
- Or omit `ADMIN_BOOTSTRAP_PASSWORD` and enter the password when prompted (visible stdin — avoid on shared screens).

Do not commit passwords. Do not use mock auth in Production.

See also: `docs/admin/ADMIN-PRODUCTION-TEST.md`.

## Roles

`SUPER_ADMIN` | `TOURNAMENT_ADMIN` | `REVIEWER` | `SUPPORT`

Permissions are enforced server-side on every admin API via `withAdminApi`.

## Session

- Cookie: HttpOnly, Secure in production, SameSite=Lax
- Signed with `ADMIN_SESSION_SECRET` (falls back to `REGISTRATION_PII_ENCRYPTION_KEY` in development only)
- Prefer a dedicated `ADMIN_SESSION_SECRET` in Production

## Logout

`POST /api/admin/auth/logout` clears the cookie and records `ADMIN_LOGOUT`.

## Rate limits / lockout

- IP hash: 20 failed attempts / hour
- Email hash: 10 failed attempts / hour
- Account lock: 8 consecutive failures → 15 minutes

Attempts store hashed keys only (never raw IP/email).

## Environment

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes |
| `ADMIN_SESSION_SECRET` | Strongly recommended (64+ random chars) |
| `ADMIN_AUTH_PROVIDER` | Optional; Production defaults to `database` |

## Migration

`drizzle/0011_admin_password_auth.sql`

Adds: `password_hash`, `password_updated_at`, `failed_login_attempts`, `locked_until`, `admin_login_attempts`, audit enum values.
