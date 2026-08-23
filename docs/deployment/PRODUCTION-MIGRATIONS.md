# Production migrations — KIRAKITAH GAMING 926

Apply migrations in order on the production Neon database. Do **not** squash, delete, or edit already-applied migrations.

Never paste real `DATABASE_URL` values into documentation, tickets, or commits.

## Required order

| Order | File | Purpose |
|------:|------|---------|
| 0 | `drizzle/0000_registration.sql` | Registration applications, guardians, email/identity unique indexes |
| 1 | `drizzle/0001_verification.sql` | Verification provider scaffolding |
| 2 | `drizzle/0002_manual_identity_review.sql` | Manual identity review columns |
| 3 | `drizzle/0003_contact_verification.sql` | Email/phone OTP challenges |
| 4 | `drizzle/0004_admin_reviewer.sql` | Admin users / reviewer support |
| 5 | `drizzle/0005_tournament_eligibility.sql` | Eligibility evaluations |
| 6 | `drizzle/0006_tournament_operations.sql` | Tournaments, participants, matches |
| 7 | `drizzle/0007_qualification_engine.sql` | Qualification pods / standings |
| 8 | `drizzle/0008_knockout_execution.sql` | Knockout bracket |
| 9 | `drizzle/0009_scheduling_and_policy.sql` | Match scheduling + competition policy |
| 10 | `drizzle/0010_phone_uniqueness.sql` | `phone_normalized` + active phone unique index |

Latest required for registration launch hardening: **0010**.

## Verify current migration state

With production credentials available only in a secure shell (never logged):

```bash
# Preferred when Drizzle journal is managed by drizzle-kit migrate
npm run db:migrate
```

Manual verification (examples — adapt to your Neon console / `psql`):

```sql
-- Confirm phone uniqueness column from 0010
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'registration_applications'
  AND column_name = 'phone_normalized';

-- Confirm active unique indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'registration_applications'
  AND indexname IN (
    'registration_event_email_active_idx',
    'registration_event_phone_active_idx',
    'registration_event_id_hash_active_idx'
  );
```

Admin readiness endpoint (authenticated):

`GET /api/admin/system/readiness`

Look for `MIGRATION_VERSION` = `PASS`.

## Safely apply migrations

1. Take a Neon snapshot / point-in-time restore point.
2. Set `DATABASE_URL` in the secure environment only.
3. Run `npm run db:migrate` from this repository revision.
4. Re-check indexes and `phone_normalized`.
5. Hit `/api/admin/system/readiness` and `/api/health`.

Do not run `db:push` against production unless Product Engineering explicitly approves an exception.
