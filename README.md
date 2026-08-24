# KIRAKITAH Official Website

Official website repository for **KIRAKITAH** — an initiative of Zurfte Zolutions.

KIRAKITAH is a scalable digital platform, with KIRAKITAH GAMING 926 as its first major public-facing initiative.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- React Hook Form + Zod
- Lucide React
- Vitest + React Testing Library + Playwright
- Deployment target: Vercel

## Development approach

Frontend-first — the user-facing experience is built and published before backend integration.

## Requirements

- **Node.js 22 LTS** (production target; see `.nvmrc`)
- npm

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test         # Unit/component tests (Vitest)
npm run test:watch   # Vitest watch mode
npm run test:e2e     # End-to-end tests (Playwright)
```

## Branches

- `main` — production-ready code (Vercel Production)
- `development` — active development (Vercel Preview)

## Vercel deployment

### Architecture

```text
GitHub
  development → Vercel Preview
  main        → Vercel Production
```

Node.js **22** (`.nvmrc`). Framework: Next.js. Build: `npm run build`.

### Environment (summary)

Full matrix: [`docs/deployment/PRODUCTION-ENV-MATRIX.md`](docs/deployment/PRODUCTION-ENV-MATRIX.md)

| Variable | Preview | Production |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Preview URL | Production canonical URL |
| `NEXT_PUBLIC_DATA_SOURCE` | `mock` or `api` | **`api` only** (no mocks) |
| Server secrets (`DATABASE_URL`, Blob, PII key, email/SMS/admin) | Optional / as needed | Required before public registration |

Production launch docs: [`docs/deployment/README.md`](docs/deployment/README.md)

### First-time setup

1. Import `Primordialt/kirakitah-website` into [Vercel](https://vercel.com).
2. Framework Preset: Next.js (auto-detected).
3. Confirm **Node.js 22**.
4. Connect Git: Preview → `development`, Production → `main`.
5. Configure environment variables per matrix (never commit secrets).

### Production safeguards

- Registration fails closed when Production infrastructure is missing
- Mock registration / email / SMS / admin auth blocked on Vercel Production
- Identity verification is **manual review only** (no automated NIN/passport/POSSAP)
- `/dev/*` routes redirect on hosted environments; `robots.txt` disallows `/dev`
- Security headers via `next.config.ts`

### Post-deploy smoke check

- `/`, `/about`, `/initiatives`, `/esports`, `/esports/register`, `/esports/rules`, `/esports/faq`
- `GET /api/health`
- Authenticated `GET /api/admin/system/readiness` (when admin auth works)
- `/dev/ui` must redirect on hosted environments

Do **not** open public registration until the launch checklist reports `REGISTRATION_READY`.

## Repository

`kirakitah-website`
