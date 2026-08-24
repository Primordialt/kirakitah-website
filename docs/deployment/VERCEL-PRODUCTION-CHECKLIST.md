# Vercel production checklist — KIRAKITAH GAMING 926

Do **not** treat this list as completed until a human operator performs each step in the Vercel dashboard.

## Checklist

1. [ ] Connect GitHub repository `Primordialt/kirakitah-website` to Vercel
2. [ ] Production branch = `main`
3. [ ] Preview branch = `development`
4. [ ] Confirm Framework = Next.js (auto); build = `npm run build`; install = `npm ci` (`vercel.json`)
5. [ ] Confirm Node.js **22** (`.nvmrc` / project settings)
6. [ ] Configure **Production** environment variables (see `PRODUCTION-ENV-MATRIX.md`)
   - [ ] `NEXT_PUBLIC_SITE_URL` = production canonical URL
   - [ ] `NEXT_PUBLIC_DATA_SOURCE=api`
   - [ ] `DATABASE_URL` (Neon production)
   - [ ] `BLOB_READ_WRITE_TOKEN` (private store)
   - [ ] `REGISTRATION_PII_ENCRYPTION_KEY` (64 hex)
   - [ ] Email HTTP provider vars *(deferred for MVP — not required to accept applications)*
   - [ ] SMS HTTP provider vars *(deferred for MVP)*
   - [ ] Admin auth vars (when real provider ready) *(deferred for MVP)*
   - [ ] `ADMIN_SESSION_SECRET` (dedicated) *(when admin auth enabled)*
7. [ ] Configure **Preview** environment variables separately (mocks allowed; do not copy Production secrets unnecessarily)
8. [ ] Deploy Production from `main` only after release merge
9. [ ] Verify deployment succeeds (build green)
10. [ ] Verify `GET /api/health` on Production (booleans only; no secrets)
11. [ ] For MVP: confirm health shows `registrationMode: MVP_MANUAL_REVIEW` and infra booleans; full admin readiness may wait until auth is enabled
12. [ ] Run synthetic registration smoke tests (`MVP-PRODUCTION-DEPLOYMENT.md` / `REGISTRATION-PRODUCTION-SMOKE-TEST.md`)
13. [ ] Review Vercel function logs for PII/OTP leakage (must be none)
14. [ ] Confirm launch gate: `MVP_REGISTRATION_READY` for MVP (not full `REGISTRATION_READY` unless FULL_PRODUCTION)
15. [ ] Confirm tournament status is intentionally `registration_open` before public launch
16. [ ] Only then open public registration communication

## MVP vs full production

Under `MVP_MANUAL_REVIEW`, email/SMS/admin providers are **DEFERRED** and must not block application submit.

See: [`MVP-PRODUCTION-DEPLOYMENT.md`](./MVP-PRODUCTION-DEPLOYMENT.md)

## Production rules

- **NO MOCK PROVIDERS**
- Do not set `NEXT_PUBLIC_DATA_SOURCE=mock` on Production (app also forces `api` when `VERCEL_ENV=production`)
- `/dev/*` must not be publicly useful on hosted environments
- Never paste secrets into GitHub Issues or this repo
