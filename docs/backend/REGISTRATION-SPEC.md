# Registration Backend — Specification

**Status:** Implemented through Step 4 (contact verification + admin foundation)  
**Stack:** Neon PostgreSQL + Vercel Blob (private)  
**Depends on:** Backend Steps 1–3A  
**Frontend route:** `/esports/register`  
**Competition:** KIRAKITAH GAMING 926 (`event-kg926`)

---

## Objective

Replace `MockRegistrationService` with a real registration pipeline that:

1. Accepts player applications with identification details and **player photo upload**
2. Persists application data and photo reference securely
3. Returns a **reference ID** to the applicant
4. Supports email/phone ownership verification challenges
5. Keeps identity verification **manual** (`pending_review`)
6. Prepares server-only administrative review boundaries (no public admin UI yet)

The frontend form UX and field order remain unchanged.

---

## Current frontend contract

### Submission type (after `toRegistrationSubmission`)

Defined in `src/domain/registration.ts` as `RegistrationSubmission`.

**Note for Step 2:** The API must accept the **player photo file** plus identification fields. Government ID document upload is **not** collected. The client will send `FormData`; server validates and stores the photo in private blob storage, persists identification number in PostgreSQL (treat as sensitive PII).

### Identity verification (revised)

| Field | Rules |
|-------|-------|
| `identificationType` | Required: `nin` \| `passport` |
| `identificationNumber` | Required; normalized server-side |
| `playerPhoto` | Required file; JPEG/PNG/WebP; ≤ 5 MB |

**NIN:** exactly 11 digits after normalization.  
**Passport:** 6–20 alphanumeric characters after normalization (uppercase).

### Validation rules (must be enforced server-side)

| Field | Rules |
|-------|-------|
| `fullName` | Required, min 1 char |
| `dateOfBirth` | Required, ISO date; age ≥ 10 |
| `country` | Required |
| `city` | Required |
| `email` | Required, valid email |
| `phone` | Required |
| `identityVerification.identificationType` | `nin` or `passport` |
| `identityVerification.identificationNumber` | See identity verification rules above |
| `identityVerification.playerPhoto` | Required file; JPEG/PNG/WebP; ≤ 5 MB |
| `gamerTag` | Required |
| `game` | Must be `eFootball Mobile` |
| `platform` | Required (`ios` \| `android`) |
| `gamingProfile` | Optional |
| `timezone` | Required |
| `availability` | Required, min 1 option |
| `socialHandles` | Optional |
| `guardian` | Required if age 10–17 |
| `consents.*` | All five must be `true` |
| `eventId` | Must match active tournament (`event-kg926`) |

### Guardian (minors)

When `calculateAge(dateOfBirth)` is 10–17:

- `guardian.fullName`, `relationship`, `email`, `phone` required
- `guardian.consent` must be `true`
- Guardian data **must not** appear in public API responses

---

## Proposed API

### `POST /api/registrations`

**Content-Type:** `multipart/form-data`

**Parts:**

| Part | Type | Description |
|------|------|-------------|
| Form fields | text / JSON | All non-file fields including `identificationType` and `identificationNumber` |
| `playerPhoto` | File | Recent player photograph |

**Unique application controls (Step 2):** enforce one active application per `(event_id, email)` and per `(event_id, identification_type, identification_number)`.

### Success response `201 Created`

```json
{
  "success": true,
  "referenceId": "KG926-2026-A1B2C3",
  "status": "received"
}
```

### Error response `4xx/5xx`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": [{ "path": "email", "message": "Email must be valid" }]
  }
}
```

### Rate limiting

- Suggested: 5 submissions per IP per hour, 3 per email per day (tune before production)

---

## Persistence model

See `src/domain/registration-application.ts`.

### `registration_applications` table (sketch)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `reference_id` | string | Unique, applicant-facing |
| `event_id` | string | `event-kg926` |
| `status` | enum | `received`, `under_review`, `verified`, `rejected`, `withdrawn` |
| `full_name` | string | |
| `date_of_birth` | date | |
| `country` | string | |
| `city` | string | |
| `email` | string | Indexed; unique per event |
| `phone` | string | |
| `identification_type` | enum | `nin`, `passport` |
| `identification_number` | string | Normalized; unique per event + type; encrypt at rest |
| `gamer_tag` | string | |
| `game` | string | |
| `platform` | string | |
| `gaming_profile` | text | Nullable |
| `timezone` | string | |
| `availability` | jsonb | string[] |
| `social_handles` | jsonb | Nullable |
| `player_photo_blob_key` | string | Private storage key |
| `player_photo_meta` | jsonb | fileName, fileSize, mimeType |
| `consents` | jsonb | All five booleans + accepted_at timestamp |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `registration_guardians` table (sketch)

Separate table or jsonb column on application — **never** joined in public queries.

| Column | Type |
|--------|------|
| `application_id` | UUID FK |
| `full_name` | string |
| `relationship` | string |
| `email` | string |
| `phone` | string |
| `consent_at` | timestamptz |

---

## Client changes (Step 2)

1. Add `ApiRegistrationService` in `src/services/registration/api.ts`
2. Build `FormData` in `RegistrationForm` when data source is `api` (include files, not metadata-only transform)
3. Display `referenceId` on success screen
4. Wire `createServices()` to use API registration when `NEXT_PUBLIC_DATA_SOURCE=api`

Mock path remains for local development and tests.

---

## Security checklist (before production)

- [ ] Server-side Zod validation
- [ ] Private blob storage for player photo only (no public URLs)
- [ ] Identification numbers stored as sensitive PII; unique constraints per event
- [ ] Guardian data access restricted to admin
- [ ] Rate limiting on registration endpoint
- [ ] No sensitive fields in client bundles or logs
- [ ] Retention and deletion policy documented
- [ ] Minor safeguarding review completed

---

## Test plan (Step 2)

- Unit: server validation, reference ID generation, guardian required logic
- Integration: POST with valid multipart → 201 + DB row + blob objects
- Integration: reject invalid file type / oversize file
- Integration: reject under-10 age

---

## Step 4 — Contact verification & admin foundation

| Capability | Status |
|------------|--------|
| Email ownership challenges | IMPLEMENTED |
| Phone ownership challenges | IMPLEMENTED |
| `email_verified_at` / `phone_verified_at` | IMPLEMENTED |
| Resend + 60s cooldown | IMPLEMENTED |
| Production mock fail-closed | IMPLEMENTED |
| Real email/SMS provider credentials | PENDING PROVIDER |
| Admin repository (server-only) | IMPLEMENTED |
| Admin dashboard / auth | FUTURE (Step 5) |
| Guardian OTP | FUTURE (product decision) |

Identity remains manual. Email/phone verification never auto-approves applications.

See `docs/backend/VERIFICATION-ARCHITECTURE.md`.
- E2E: full form submit against API mode (CI with test DB or mocked storage)
- Security: confirm guardian not in any public GET response
