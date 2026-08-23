# Neon production checklist — KIRAKITAH GAMING 926

Do not create or migrate production databases from automated agent sessions without Product Owner intent.

## Checklist

1. [ ] Create or confirm a dedicated **production** Neon project/database (not a shared playground)
2. [ ] Obtain production `DATABASE_URL` via Neon / Vercel Storage integration
3. [ ] Store `DATABASE_URL` only in Vercel Production env (server-only)
4. [ ] Apply migrations in order `0000` → `0010` using `npm run db:migrate` from the release revision (see `PRODUCTION-MIGRATIONS.md`)
5. [ ] Verify schema: `registration_applications.phone_normalized` exists
6. [ ] Verify indexes: email / phone / identity active unique indexes
7. [ ] Verify constraints / FKs for guardians, challenges, audit, tournaments as needed
8. [ ] Verify app connectivity via `/api/health` (`databaseConfigured: true`) and a controlled admin readiness check
9. [ ] Confirm no accidental test applicant PII remains before public launch
10. [ ] Confirm Neon backup / restore (PITR or snapshot) is enabled for the production plan in use — **do not claim features not visible on the plan**

## What NOT to do

- Do not use a development branch database as Production
- Do not run `db:push` on Production without explicit approval
- Do not log or commit `DATABASE_URL`
- Do not delete production registration data as “cleanup”
