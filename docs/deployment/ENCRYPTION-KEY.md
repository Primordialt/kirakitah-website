# PII encryption key — KIRAKITAH GAMING 926

Variable: `REGISTRATION_PII_ENCRYPTION_KEY` (server-only).

## Expected format

- **64 hexadecimal characters** (32 bytes)
- Used for AES-256-GCM encryption of identification numbers
- Also used as pepper for identification uniqueness hashes and submit IP hashes

Validation in code (`src/server/registration/pii.ts`):

> must be 64 hex characters (32 bytes)

Invalid format → encryption throws; readiness reports `ERROR`.

## Generation (local / ops machine only)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Never** commit the output. **Never** paste it into chat, issues, or docs.

## Where it belongs

- Vercel → Project → Settings → Environment Variables → **Production** (and Preview only if Preview uses real registration)
- Mark as sensitive / encrypted if the dashboard supports it

## Missing / invalid behavior

- Missing → registration APIs return configuration unavailable (fail closed)
- Invalid length/format → runtime encryption error / readiness `ERROR`

## Rotation

There is **no automated key rotation** implemented. Rotation would require a planned re-encryption of existing `identification_number_encrypted` values and dual-key read support — **not implemented**. Treat the production key as long-lived; rotate only with an explicit engineering change request.

Do not reuse this key as a public secret. Prefer a dedicated `ADMIN_SESSION_SECRET` for admin cookies.
