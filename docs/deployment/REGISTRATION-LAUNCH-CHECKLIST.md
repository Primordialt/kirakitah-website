# Registration launch checklist — KIRAKITAH GAMING 926

Competition: **KIRAKITAH GAMING 926** (not “2026”). Commencement: **14 September 2026**.  
Identity: **manual review only**.

Only check a box after a human verifies it in the real Production environment.

## INFRASTRUCTURE

- [ ] Neon production database exists
- [ ] Correct migrations applied (`0000` → `0010`)
- [ ] Vercel Blob configured (private)
- [ ] Encryption key configured (valid 64 hex)

## PROVIDERS

- [ ] Email provider configured
- [ ] Email delivery tested with synthetic mailbox (**EMAIL DELIVERY unblocked**)
- [ ] SMS provider configured
- [ ] SMS delivery tested with synthetic phone (**SMS DELIVERY unblocked**)
- [ ] Admin auth provider configured and login tested (**ADMIN AUTH unblocked**)

## VERCEL

- [ ] Production env vars configured
- [ ] Production data source = `api`
- [ ] Node 22
- [ ] Production deployment successful

## SECURITY

- [ ] No secrets in repository
- [ ] No mock providers in production
- [ ] Admin protected (auth + CSRF + RBAC)
- [ ] Registration API fail-closed when misconfigured
- [ ] PII not exposed in public APIs / logs
- [ ] Photos private

## TESTING

- [ ] Adult registration tested
- [ ] Minor registration tested
- [ ] Email verification tested
- [ ] Phone verification tested
- [ ] Duplicate protections tested
- [ ] Manual identity review tested
- [ ] Admin workflow tested

## LAUNCH

- [ ] Health check passes (safe booleans)
- [ ] Readiness check passes (all required = `CONFIGURED`)
- [ ] Launch gate = `REGISTRATION_READY`
- [ ] Tournament status intentionally `registration_open`
- [ ] Product decisions recorded (see `PRODUCT-DECISIONS-BEFORE-LAUNCH.md`)

Only then:

- [ ] **PUBLIC REGISTRATION OPENED**
