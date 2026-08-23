# Vercel Blob checklist — KIRAKITAH GAMING 926

Player photos must remain **private**. Do not make the Blob store public.

## Existing behavior

| Concern | Implementation |
|---------|----------------|
| Upload | `storePlayerPhoto` via `@vercel/blob` `put(..., { access: "private" })` |
| Path | `registrations/<applicationId>/player-photo.<ext>` |
| Allowed types | JPEG, PNG, WebP (MIME + magic bytes) |
| Max size | 5 MB |
| DB storage | Blob key + metadata only (never binary in Postgres) |
| Public APIs | Must not return Blob URLs |
| Admin access | Authenticated admin photo route with permission |
| Orphan cleanup | `deletePlayerPhoto` if DB insert fails after upload |

## Checklist

1. [ ] Create / confirm a Vercel Blob store attached to the project
2. [ ] Confirm store access mode supports **private** objects
3. [ ] Set `BLOB_READ_WRITE_TOKEN` in Vercel Production (server-only)
4. [ ] Confirm Preview token is separate if Preview uploads are enabled
5. [ ] Upload a synthetic registration photo and confirm it is not publicly fetchable without auth
6. [ ] Confirm admin photo retrieval requires session + `photo:view` (or equivalent)
7. [ ] Confirm failed registration path does not leave unmanaged orphans (best-effort delete)
8. [ ] Confirm production logs never print Blob URLs containing tokens

## Failure behavior

Missing token → registration backend not configured / upload throws → controlled API error.
