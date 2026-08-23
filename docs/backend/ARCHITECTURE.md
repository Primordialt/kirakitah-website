# KIRAKITAH Backend — Architecture & Foundation Audit

**Phase:** Backend Steps 1–8 (registration + admin + eligibility + competition + qualification engine)  
**Date:** August 23, 2026  
**Repository:** [kirakitah-website](https://github.com/Primordialt/kirakitah-website)  
**Deployment:** Vercel (Next.js 15 App Router, Node 22, region `iad1`)

---

## Executive summary

The KIRAKITAH frontend is production-ready with a **service abstraction layer**. Registration now has a real Neon + Blob backend, manual identity review, and email/phone ownership verification challenges.

**Today:** Registration API, contact verification, manual identity review, secure admin reviewer workflow, tournament eligibility/participation, competition operations foundation, and **KG926 qualification engine** (32 pods, single elimination, host rule, Top 32 advancement) are implemented.

**Next implementation priority:** **Backend Step 9 — Finalize Knockout Mechanics & Tournament Execution**.

Admin reviewer workflow (Step 5) is implemented with production auth **PENDING PROVIDER**.

Tournament eligibility (Step 6): [TOURNAMENT-ELIGIBILITY.md](./TOURNAMENT-ELIGIBILITY.md).  
Competition operations (Step 7): [TOURNAMENT-OPERATIONS.md](./TOURNAMENT-OPERATIONS.md).  
Qualification engine (Step 8): [QUALIFICATION-SYSTEM.md](./QUALIFICATION-SYSTEM.md).

This document audits the frontend foundations and tracks backend architecture evolution.

---

## Current stack (unchanged)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Tests | Vitest, Playwright |
| Runtime | Node 22 |
| Hosting | Vercel |

**Constraints (non-negotiable):**

- Do not replace Next.js or migrate to another frontend framework.
- Do not create a separate backend repository at this stage.
- Build backend around existing frontend contracts, not the reverse.

---

## Frontend architecture audit

### Layer diagram (current)

```text
┌─────────────────────────────────────────────────────────────┐
│  Pages (Server Components)     │  Features (Client Components) │
│  /esports, /initiatives, …   │  RegistrationForm, ContactForm│
└──────────────┬───────────────┴──────────────┬────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    src/services/index.ts                      │
│         getDataSource() → mock (default) | api (throws)       │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Mock services → src/data/mocks/*.ts (static TypeScript)      │
└──────────────────────────────────────────────────────────────┘
```

### Service inventory

| Service | Interface | Mock | Consumed by |
|---------|-----------|------|-------------|
| `registration` | `IRegistrationService` | `MockRegistrationService` | `/esports/register` |
| `contact` | `IContactService` | `MockContactService` | `/contact` |
| `tournaments` | `ITournamentService` | `MockTournamentService` | `/esports` |
| `initiatives` | `IInitiativeService` | `MockInitiativeService` | `/initiatives` |
| `stories` | `IStoryService` | `MockStoryService` | `/`, `/stories` |
| `faqs` | `IFAQService` | `MockFAQService` | `/esports/faq` |
| `events` | `IEventService` | `MockEventService` | *(wired, unused)* |

**Data-source toggle:** `NEXT_PUBLIC_DATA_SOURCE=mock|api` in `src/config/data-source.ts`. Setting `api` currently throws at startup — intentional guard until API services exist.

### Domain models (`src/domain/`)

Shared types used by both frontend and (future) backend:

- `registration.ts` — form schema, submission payload, guardian rules, age validation
- `registration-application.ts` — application lifecycle types (Step 1 foundation)
- `tournament.ts`, `event.ts` — tournament extends event
- `initiative.ts`, `story.ts`, `faq.ts`, `contact.ts`
- `image-asset.ts`

### Registration pipeline (current)

```text
RegistrationForm (client)
    → React Hook Form + registrationSchema (Zod)
    → toRegistrationSubmission() — strips File → metadata only
    → services.registration.submit(RegistrationSubmission)
    → MockRegistrationService — 500ms delay, reference ID, no persistence
```

**Form sections (order):**

1. Player Information  
2. Identity Verification (identification type + number + player photo)  
3. Gaming Information  
4. Availability  
5. Social (optional)  
6. Consent  
7. Guardian Information (if age 10–17)

**Identity handling today:**

- Identification: **NIN** or **International Passport** number (no ID document upload)
- Player photo validated client-side (`src/lib/identity-upload.ts`): max 5 MB; JPEG/PNG/WebP
- Only **player photo metadata** (`fileName`, `fileSize`, `mimeType`) reaches the mock service until Step 2
- Mock service **rejects** payloads containing raw file content keys.

**Hardcoded tournament binding:**

- `eventId`: `event-kg926` (`TOURNAMENT_EVENT_ID` in `src/config/competition.ts`)
- `game`: `eFootball Mobile`

### Content layer

All public content (initiatives, stories, FAQs, tournament copy) lives in:

- `src/data/mocks/*.ts` — static data
- `src/config/*.ts` — page copy and esports rules

Sitemap reads mocks directly. **CMS/database not required for Step 2 (registration).**

### Security & deployment (existing)

- `middleware.ts` — blocks `/dev/*` on Vercel preview/production
- `next.config.ts` — security headers (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)
- `public/ms41766290.txt` — Microsoft 365 domain verification
- No CSP, rate limiting, auth, or audit logging yet

### Test coverage relevant to backend

- `registration.test.tsx` — schema, guardian logic, metadata-only submission
- `identity-upload.test.ts` — file validation rules
- `e2e/esports.spec.ts` — full registration flow with file uploads
- Service tests: initiatives mock only

---

## Backend requirements (by capability)

### Phase 2 — Registration (first build)

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Accept registration applications | P0 | Multipart upload with real files |
| Persist application record | P0 | Status workflow, reference ID |
| Store player photo securely | P0 | Private Vercel Blob; access-controlled |
| Persist identification number | P0 | Neon PostgreSQL; treat as sensitive PII |
| Server-side Zod validation | P0 | Re-validate all fields + photo file |
| Guardian data for minors | P0 | Never expose in public API responses |
| Consent audit trail | P0 | Timestamp + version of terms accepted |
| Return reference ID to applicant | P0 | UI already expects success; display ID |
| Duplicate detection | P1 | Same email + eventId |
| Rate limiting | P1 | Per IP / per email |
| Email confirmation | P1 | Player (+ guardian if minor) |
| Admin review interface | P2 | Can start as external tool + DB |

### Later phases (not Step 1 or 2)

- Tournament operations (scheduling, results, brackets)
- Content CMS / admin content management
- Admin authentication & RBAC
- Contact form email delivery
- Public tournament data APIs

---

## Approved production stack (Step 2)

These decisions are locked for the first backend implementation:

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Application records** | **Neon PostgreSQL** | Relational, audit-friendly; native Vercel integration |
| **Identity documents** | **Vercel Blob (private)** | Player photo only — no government ID file upload |
| **HTTP layer** | Next.js Route Handlers | Colocated with frontend; no separate backend repo |
| **Upload pattern** | Direct multipart POST | Two files ≤ 5 MB each; single request for MVP |

Identity files are stored by internal blob key only. PostgreSQL holds application metadata, status, and blob key references — never file bytes.

---

## Proposed architecture

### Principle: colocated Next.js backend

Use **Route Handlers** in `src/app/api/` for HTTP endpoints and **`src/server/`** for server-only logic (validation, storage adapters, DB access). Keep the existing **service interface** on the client; add `ApiRegistrationService` that calls `/api/registrations`.

```text
RegistrationForm (client, unchanged UX)
    → ApiRegistrationService (new, Step 2)
    → POST /api/registrations (multipart/form-data)
    → src/server/registration/* (validate, store files, persist record)
    → Neon PostgreSQL + Vercel Blob (private)
```

### Storage (registration)

| Concern | Provider | Notes |
|---------|----------|-------|
| Application records | Neon PostgreSQL | Via Vercel integration; `DATABASE_URL` server-only |
| Identity files | Vercel Blob (private access) | Player photo only; `BLOB_READ_WRITE_TOKEN` |
| Secrets | Vercel env vars | Never `NEXT_PUBLIC_*` for credentials |

### API route conventions

- `src/app/api/health/route.ts` — liveness check (Step 1 foundation)
- `src/app/api/registrations/route.ts` — `POST` (Step 2)
- JSON errors: `{ error: { code, message } }` via `src/server/errors.ts`
- Server env validated in `src/server/env.ts`

### Registration upload strategy (Step 2 recommendation)

**Option A — Direct multipart POST (recommended for MVP):**

- Client sends `FormData` with JSON fields + two files
- Route Handler validates, streams files to blob storage, writes DB row
- Single request; simpler than pre-signed URLs

**Option B — Pre-signed upload:**

- Client requests upload URLs, uploads files, then submits metadata
- Better for very large files; more complex

Given 5 MB limits and two files, **Option A** is sufficient.

### Data model sketch (registration)

See `src/domain/registration-application.ts` and `docs/backend/REGISTRATION-SPEC.md`.

Statuses: `received` → `under_review` → `verified` | `rejected`

Identity files stored by internal key; never returned via public GET.

### Security requirements (registration)

- Server-side validation (never trust client-only Zod)
- Files stored in **private** storage with signed admin-only access
- Guardian fields excluded from any public API response
- Rate limit `POST /api/registrations`
- Audit log: created_at, ip hash (optional), status transitions
- Retention policy documented before production (PII + minors)

---

## Repository foundation (Step 1 additions)

| Path | Purpose |
|------|---------|
| `docs/backend/ARCHITECTURE.md` | This document |
| `docs/backend/REGISTRATION-SPEC.md` | Step 2 implementation spec |
| `src/server/env.ts` | Server-only environment variable access |
| `src/server/errors.ts` | Standard API error shapes |
| `src/server/registration/types.ts` | Server-side registration types |
| `src/domain/registration-application.ts` | Application lifecycle domain types |
| `src/app/api/health/route.ts` | Health check endpoint |
| `src/services/contact/types.ts` | `IContactService` interface |
| `.env.example` | Documented server env placeholders |

**Not added in Step 1:** database client, ORM, blob SDK, auth, registration route implementation.

---

## Environment variables

### Public (existing)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, OG, sitemap |
| `NEXT_PUBLIC_DATA_SOURCE` | `mock` (default) or `api` |

### Server-only (Step 2 — Neon + Vercel Blob)

| Variable | Purpose | Provision via |
|----------|---------|---------------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Vercel → Storage → Neon integration |
| `BLOB_READ_WRITE_TOKEN` | Private identity document storage | Vercel → Storage → Blob store |
| `REGISTRATION_RATE_LIMIT_*` | Rate limiting config | Manual (production registration API) |

---

## Migration path: mock → API

1. Implement `POST /api/registrations` + storage + DB  
2. Implement `ApiRegistrationService` implementing `IRegistrationService`  
3. Update `RegistrationForm` to send `FormData` with files when `api` mode  
4. Update `createServices()` in `src/services/index.ts` to return API implementations  
5. Set `NEXT_PUBLIC_DATA_SOURCE=api` in Vercel production  
6. Keep mock as default for local dev and CI unless explicitly testing API

---

## Remaining decisions (before or during Step 2)

**Decided:** Neon PostgreSQL + Vercel Blob (private) for registration.

**Still open:**

1. **Email provider** — Resend, SendGrid, or Microsoft 365 Graph (domain verified)
2. **Admin review** — Custom admin UI vs external tool for MVP
3. **Reference ID format** — e.g. `KG926-2026-XXXXXX` vs UUID

---

## What not to build yet

- Full tournament engine
- CMS for stories/initiatives
- Admin dashboard (beyond minimal review needs)
- Authentication system
- Contact form backend
- Separate microservices or non-Next.js API server
