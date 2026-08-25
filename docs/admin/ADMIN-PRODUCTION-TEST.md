# Production admin authentication test plan — KIRAKITAH GAMING 926

Use this checklist after Production configuration (migration `0011`, env secrets, first admin provisioned). Do **not** record real passwords, session cookies, or PII in tickets or screenshots shared broadly.

**Status meanings**

| Status | Meaning |
|--------|---------|
| PASS | Observed on Production |
| FAIL | Broken — block announcement |
| NOT RUN | Not yet executed |

Do not claim Production admin login is live until steps 1–4 pass on the Production URL.

---

## Prerequisites

- [ ] Migration `drizzle/0011_admin_password_auth.sql` applied
- [ ] `DATABASE_URL` set (Production)
- [ ] `ADMIN_SESSION_SECRET` set (dedicated Production secret)
- [ ] `ADMIN_AUTH_PROVIDER` unset or `database` (never `mock` on Production)
- [ ] First admin created via `npm run admin:create` in a secure shell

---

## 1. Create first admin

From a secure operator shell (never commit output):

```bash
npm ci
set ADMIN_BOOTSTRAP_PASSWORD=<long-password-not-logged>
npm run admin:create -- --email <ops-email> --name "Ops Admin" --role SUPER_ADMIN
```

Expected:

- [ ] Command succeeds with `{ success: true, id, email, role }` only
- [ ] Password / hash never printed
- [ ] Duplicate email refused safely
- [ ] Explicit `--role` required

---

## 2. Login (valid credentials)

1. Open `https://<production-host>/admin/login`
2. Sign in with provisioned email + password

Expected:

- [ ] Redirect into admin (e.g. applications)
- [ ] Cookie `kirakitah_admin_session` is HttpOnly, Secure, SameSite=Lax
- [ ] Audit event `ADMIN_LOGIN_SUCCESS` recorded (no password/hash in metadata)

---

## 3. Invalid login

Attempt wrong password and nonexistent email separately.

Expected:

- [ ] Same generic message: **Invalid email or password.**
- [ ] No account enumeration (“email not found”, “inactive”, etc.)
- [ ] Audit `ADMIN_LOGIN_FAILURE` with safe reason category only

---

## 4. Logout

Use admin logout control / `POST /api/admin/auth/logout`.

Expected:

- [ ] Session cookie cleared
- [ ] `/admin/applications` redirects to `/admin/login`
- [ ] Audit `ADMIN_LOGOUT`

---

## 5. Expired session

After TTL (8 hours) or with a deliberately expired/forged cookie:

Expected:

- [ ] Admin pages redirect to `/admin/login`
- [ ] `/api/admin/*` (except login) returns 401
- [ ] No admin content rendered for expired sessions

---

## 6. Inactive user

Set `admin_users.active = false` for a test admin (then restore).

Expected:

- [ ] Login fails with generic invalid credentials message
- [ ] No “account disabled” disclosure

---

## 7. RBAC verification

Sign in as each role (or temporarily provision test admins):

| Role | Must be able to | Must be denied |
|------|-----------------|----------------|
| SUPER_ADMIN | Full admin ops per permissions | — |
| TOURNAMENT_ADMIN | Tournament ops; applications list/view | `identity:reveal`, `guardian:view`, `photo:view`, `admin:manage` |
| REVIEWER | Application review, identity reveal, guardian, photo | Tournament mutations / `admin:manage` |
| SUPPORT | Limited application/tournament view | Identity reveal, guardian, photo, status mutations |

Expected:

- [ ] Forbidden actions → `/admin/forbidden` or API 403
- [ ] Client never decides authorization alone

---

## 8. Sensitive-data permission checks

On an application detail page:

- [ ] NIN/passport reveal requires `identity:reveal`
- [ ] Guardian data requires `guardian:view`
- [ ] Player photo requires `photo:view`
- [ ] Each reveal generates the existing audit event
- [ ] SUPPORT cannot access restricted identity/photo payloads

---

## 9. Audit verification

Confirm recent rows / events include only safe metadata:

- [ ] `ADMIN_LOGIN_SUCCESS`
- [ ] `ADMIN_LOGIN_FAILURE`
- [ ] `ADMIN_LOGOUT`
- [ ] No password, password hash, OTP, or raw PII in metadata

---

## 10. Rate-limit verification

From one IP / one email, exceed failed-login thresholds (use a throwaway test account).

Expected:

- [ ] Response: **Too many sign-in attempts. Please try again later.**
- [ ] HTTP 429 for rate limit path
- [ ] Limits backed by DB (`admin_login_attempts` / account lock), not memory-only

---

## Related

- `docs/admin/ADMIN-AUTH.md` — architecture
- `docs/deployment/MVP-PRODUCTION-DEPLOYMENT.md` — deployment sequence
