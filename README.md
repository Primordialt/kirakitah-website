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

## Repository

`kirakitah-website`
