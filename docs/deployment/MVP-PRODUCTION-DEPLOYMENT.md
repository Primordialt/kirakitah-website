# MVP Production Deployment Checklist — KIRAKITAH GAMING 926

Operating mode: **`MVP_MANUAL_REVIEW`** (`src/config/registration-policy.ts`)

Goal: receive real applications with manual identity review. Email OTP, SMS OTP, and production admin auth remain **DEFERRED**.

Do **not** treat this list as complete until a human verifies each item in Vercel / Neon.

## A. Code (repository)

- [x] `REGISTRATION_OPERATING_MODE = MVP_MANUAL_REVIEW`
- [x] Contact verification = `DEFERRED` (no OTP on submit)
- [x] Identity = `MANUAL` (`pending_review`)
- [x] Admin workflow = `MANUAL_DEFERRED_AUTH`
- [x] Duplicate protection retained (email / phone / identity)
- [x] Production mocks blocked for registration / contact / admin on Vercel Production
- [x] Migrations present: `0000` → `0010`

## B. Vercel Production (Product Owner / ops)

1. [ ] Production branch = `main` (merge `development` when ready to release)
2. [ ] Preview branch = `development`
3. [ ] Node.js **22**
4. [ ] Set Production env (server-only unless noted):

| Variable | Required for MVP |
|----------|------------------|
| `NEXT_PUBLIC_SITE_URL` | Yes (public) |
| `NEXT_PUBLIC_DATA_SOURCE=api` | Yes (public; also forced when `VERCEL_ENV=production`) |
| `DATABASE_URL` | Yes |
| `BLOB_READ_WRITE_TOKEN` | Yes (private Blob) |
| `REGISTRATION_PII_ENCRYPTION_KEY` | Yes (64 hex chars) |

**Not required for MVP submit:** email/SMS provider vars, admin auth provider vars.

5. [ ] Deploy Production after merge to `main`
6. [ ] `GET /api/health` — safe booleans; `registrationMode: MVP_MANUAL_REVIEW`
7. [ ] Confirm `/dev/*` redirects on hosted environments

## C. Neon (Product Owner / ops)

1. [ ] Production Neon database exists
2. [ ] Apply migrations `0000` → `0010` (`npm run db:migrate` with Production `DATABASE_URL` only)
3. [ ] Verify `phone_normalized` column + active unique indexes
4. [ ] Verify tournament row `event-kg926`:
   - name = `KIRAKITAH GAMING 926`
   - game = `eFootball Mobile`
   - commencement = `2026-09-14`
   - status = **`registration_open`** (seeded in `0005`; confirm after migrate)

Do **not** reset / drop / delete production data.

## D. Synthetic verification (after B + C)

Use synthetic identity only (no real PII).

1. [ ] Submit adult application via Production `/esports/register` or `POST /api/registrations`
2. [ ] Receive reference `KG926-…`
3. [ ] DB: `status=received`, identity `pending_review` / manual, email `pending`, phone `pending`
4. [ ] No OTP challenge required for submit
5. [ ] Duplicate resubmit → controlled conflict
6. [ ] Photo not publicly accessible
7. [ ] Logs contain no NIN / passport / email / phone / OTP / secrets

## E. Launch gate

| Gate | When |
|------|------|
| `MVP_REGISTRATION_READY` | DB + Blob + encryption + migrations + data source OK; providers may be DEFERRED |
| `REGISTRATION_READY` | Reserved for `FULL_PRODUCTION` + real email/SMS/admin |
| `REGISTRATION_NOT_READY` | Mandatory MVP infra missing |

Authenticated readiness: `GET /api/admin/system/readiness` (admin auth still deferred — may be unavailable until provider is enabled; use `/api/health` + ops DB checks for MVP).

## F. Do not do in this phase

- Switch to `FULL_PRODUCTION`
- Enable automated NIN / POSSAP
- Implement email/SMS providers
- Create insecure admin bypasses
- Open public registration marketing until B–D pass
