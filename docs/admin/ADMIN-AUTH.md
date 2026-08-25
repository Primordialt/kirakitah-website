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
8. Subsequent requests re-check that the account is still **active** when using database auth

Failed credentials always return: **Invalid email or password.**

Rate-limited: **Too many sign-in attempts. Please try again later.**

Inactive accounts cannot log in. Deactivated accounts lose access on the next authenticated request.

## Password hashing

Format: `scrypt$N$r$p$salt$derived` (base64url)

- N=16384, r=8, p=1, key length 64
- Never log or return hashes
- Minimum password length: 12 (prefer 16+)
- Common passwords rejected at provisioning

## Provisioning

### Bootstrap (first SUPER_ADMIN)

Apply migrations through `0014_admin_user_management`, then in a secure shell:

```bash
npm ci
set ADMIN_BOOTSTRAP_PASSWORD=your-long-password
npm run admin:create -- --email you@example.com --name "Your Name" --role SUPER_ADMIN
```

### Ongoing staff accounts

After the first SUPER_ADMIN exists, prefer:

`/admin/users` → **Create administrator**

CLI remains available for recovery/bootstrap only.

## Role management (SUPER_ADMIN only)

Permission: `admin:manage` — **SUPER_ADMIN only**.

| Capability | SUPER_ADMIN | TOURNAMENT_ADMIN | REVIEWER | SUPPORT |
|------------|-------------|------------------|----------|---------|
| `admin:manage` | yes | no | no | no |
| Create admins | yes | no | no | no |
| Change roles | yes | no | no | no |
| Activate / deactivate | yes | no | no | no |

### Self-protection

There must always be at least one **active SUPER_ADMIN**.

- Last active SUPER_ADMIN cannot be deactivated
- Last active SUPER_ADMIN cannot be downgraded
- Prefer deactivation over deletion (accounts remain auditable)

### Audit events

- `ADMIN_CREATED`
- `ADMIN_ROLE_CHANGED` (metadata: previousRole, newRole, targetAdminId)
- `ADMIN_ACTIVATED`
- `ADMIN_DEACTIVATED`
- `ADMIN_LOGIN_SUCCESS` / `ADMIN_LOGIN_FAILURE` / `ADMIN_LOGOUT`

Never include passwords, hashes, session secrets, or OTPs in audit metadata.

## Roles & review permissions

| Permission | SUPER_ADMIN | TOURNAMENT_ADMIN | REVIEWER | SUPPORT |
|------------|-------------|------------------|----------|---------|
| `applications:list` / `view` | yes | yes | yes | yes |
| `applications:status` | yes | yes | yes | no |
| `identity:review` | yes | no | yes | no |
| `social:review` | yes | yes | yes | no |
| `tournament:eligibility` | yes | yes | yes | no |
| `tournament:participant_select` | yes | yes | no | no |
| `admin:manage` | yes | no | no | no |

**REVIEWER** can review applications, identity, social follows, and update application status.  
**REVIEWER cannot** create admins or select tournament participants.

Application approval remains separate from participant selection.

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

## Migrations

- `0011_admin_password_auth` — password hash, lockout, login attempts
- `0014_admin_user_management` — admin management audit enums + `admin_users.updated_at`

Do not apply Production migrations automatically from Cursor.
