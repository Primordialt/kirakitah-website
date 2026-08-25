# Production migrations — KIRAKITAH GAMING 926

Apply migrations in order on the production Neon database. Do **not** squash, delete, or edit already-applied migrations.

Never paste real `DATABASE_URL` values into documentation, tickets, chat, or commits.

**Do not run production migrations from this agent session.** The Product Owner executes them intentionally.

## 1. Migration order (actual repository sequence)

| Order | File | Purpose |
|------:|------|---------|
| 0 | `drizzle/0000_registration.sql` | Registration applications, guardians, email + identity unique indexes |
| 1 | `drizzle/0001_verification.sql` | Verification enums + challenge scaffolding |
| 2 | `drizzle/0002_manual_identity_review.sql` | Manual identity review status model |
| 3 | `drizzle/0003_contact_verification.sql` | Email/phone verified timestamps + review columns |
| 4 | `drizzle/0004_admin_reviewer.sql` | Admin users / roles |
| 5 | `drizzle/0005_tournament_eligibility.sql` | Tournaments, eligibility evaluations, participants foundation |
| 6 | `drizzle/0006_tournament_operations.sql` | Competition operations foundation (phases/matches scaffolding) |
| 7 | `drizzle/0007_qualification_engine.sql` | Qualification pods / standings |
| 8 | `drizzle/0008_knockout_execution.sql` | Knockout bracket execution |
| 9 | `drizzle/0009_scheduling_and_policy.sql` | Match scheduling + competition policy history |
| 10 | `drizzle/0010_phone_uniqueness.sql` | `phone_normalized` + active phone unique index |
| 11 | `drizzle/0011_admin_password_auth.sql` | Admin password hash, lockout, login attempt rate limits, audit enum |
| 12 | `drizzle/0012_social_follow_eligibility.sql` | Social follow attestation + per-platform manual review + kg926-v2 eligibility |
| 13 | `drizzle/0013_kg926_social_channels.sql` | Add `x` social platform; KG926 required set X+Instagram+TikTok; eligibility `kg926-v3` |

Latest required for registration + admin login + social follow eligibility: **0013**.

No duplicate migration numbers in the repository. Order is deterministic by numeric filename prefix.

### Migration 0012 notes

- Adds `registration_social_follows` (unique application+platform)
- Adds application-level `social_follow_status` / attestation columns
- Backfills existing applications to `social_follow_status = pending_review` (does not remove participants)
- Updates `event-kg926` eligibility rules to `kg926-v2` with `socialFollowingRequired: true`

### Migration 0013 notes

- Adds enum value `x` to `social_platform` (YouTube retained for future optional use)
- Updates `event-kg926` to eligibility **kg926-v3** with `requiredSocialPlatforms: ["x","instagram","tiktok"]`
- Does not invent a YouTube URL
- Rollback: prefer forward-fix; do not edit applied migrations

## 2. Inspect current production migration state

With production credentials available only in a secure shell (never logged):

```sql
-- Confirm phone uniqueness column from 0010
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registration_applications'
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

Authenticated readiness:

`GET /api/admin/system/readiness` → check `MIGRATION_VERSION`.

## 3. Apply pending migrations

1. Take a Neon snapshot / PITR restore point.
2. Set `DATABASE_URL` only in a secure environment (local shell / CI secret — not committed).
   Prefer Neon’s **direct** (non-`-pooler`) connection string for migrations.
3. Ensure dependencies are installed (`pg` is required so `drizzle-kit migrate` uses
   node-postgres instead of `@neondatabase/serverless` WebSockets):

```bash
npm ci
```

4. From this repository revision:

```bash
npm run db:migrate
```

Expected migrate output includes: `Using 'pg' driver for database querying`.

If you still see the Neon WebSocket warning/error, confirm `pg` is installed and
that `DATABASE_URL` is set for that shell session.

5. Re-run the SQL verification queries above.
6. Confirm KG926 tournament seed / status:

```sql
SELECT id, name, game, commencement_date, target_participant_count, qualification_target,
       prize_info, status
FROM tournaments
WHERE id = 'event-kg926';
```

Expected: name `KIRAKITAH GAMING 926`, game `eFootball Mobile`, commencement `2026-09-14`,
target `128`, qualification `32`, prize containing `US$100`, status `registration_open`.

If this query cannot be run: report **KG926 live state = UNKNOWN** (do not invent open status).

6. Hit `/api/admin/system/readiness` and `/api/health`.

## 4. Verify success

- `phone_normalized` column exists and is `NOT NULL`
- Three active unique indexes present
- KG926 row present with `registration_open` (or UNKNOWN if DB not checked)
- Registration create path accepts a synthetic test application (MVP: DB + Blob + PII key only)
- Readiness `MIGRATION_VERSION` = `CONFIGURED`

## 5. What NOT to do

- Do not edit applied SQL files
- Do not squash history
- Do not run `npm run db:push` against production unless Product Engineering explicitly approves an exception
- Do not share `DATABASE_URL` in tickets or chat
- Do not delete registration / guardian / audit rows as part of “cleanup”

## 6. Rollback considerations

Drizzle forward migrations are the supported path. Rollback is **manual restore from Neon snapshot/PITR**, not automated down-migrations. Plan restore points before applying `0010` (and any future migration) on production.
