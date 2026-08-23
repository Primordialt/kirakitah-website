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
GitHub (development branch)
   ↓
Vercel Preview deployment
   ↓
Next.js frontend (mock data services)
```

Production deployments should track the `main` branch once release-ready.

### First-time setup

1. Import `Primordialt/kirakitah-website` into [Vercel](https://vercel.com).
2. Set **Framework Preset** to Next.js (auto-detected).
3. Confirm **Node.js 22** (from `.nvmrc`).
4. Add environment variables:

| Variable | Preview | Production | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Preview domain URL | Production domain URL | Canonical/SEO base URL |
| `NEXT_PUBLIC_DATA_SOURCE` | `mock` | `mock` | Keep `mock` until backend exists |

5. Connect Git:
   - **Preview** → `development` branch
   - **Production** → `main` branch

### Deploy from CLI (optional)

```bash
npx vercel login
npx vercel link
npx vercel --prebuilt   # after npm run build locally, optional
npx vercel              # preview deploy
npx vercel --prod       # production deploy (main branch recommended)
```

### Production safeguards

- `/dev/*` routes redirect to `/` on Vercel Preview and Production
- `robots.txt` disallows `/dev`
- Security headers applied via `next.config.ts`
- Mock registration only — no real backend integration in this phase

### Post-deploy smoke check

Verify these routes on the hosted deployment:

- `/` — homepage
- `/about`
- `/initiatives`
- `/esports` — KIRAKITAH GAMING 926
- `/esports/register` — registration form
- `/esports/rules`
- `/esports/faq`
- `/community`, `/stories`, `/contact` — coming-soon placeholders
- `/dev/ui` — must redirect to `/` on hosted environments

## Repository

`kirakitah-website`
