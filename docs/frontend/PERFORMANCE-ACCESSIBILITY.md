# Performance & Accessibility Hardening

Documentation for the homepage and participant portal accessibility/performance pass on `development` (post participant tournament experience `8824de3`).

## Lighthouse baseline (PageSpeed Insights — public homepage)

| Category | Before | Target |
| --- | --- | --- |
| Performance | 97 | 100 |
| Accessibility | 87 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

Baseline captured from Google PageSpeed Insights against the production homepage prior to this phase.

## Issues found

### Accessibility

1. **Color contrast** — `--text-muted` (#71717a) and `--accent` (#8b5cf6) failed WCAG AA on dark surfaces (`#080810`, `#0f0f1a`, `bg-surface/50`). Affected footer tagline, copyright, parent organisation line, hero eyebrow, brand intro tags, and muted UI copy.
2. **Invalid list structure** — `Principles` section used `<Reveal>` (renders `<div>`) as direct child of `<ol>`, breaking ordered list semantics.
3. **Identical link purpose** — Community section CTA reused "JOIN KIRAKITAH" while hero/final CTAs with the same label pointed to `/register`.
4. **Brand intro tags** — Decorative tags were `aria-hidden` while still visible; contrast failed and content was excluded from assistive tech.

### SEO / metadata

- Canonical host must remain `https://www.kirakitah.com` in production (not bare domain or Vercel preview URLs).
- Structured data was not present.

### Performance

- Montserrat loaded without explicit weight subset (only typography weights in use are 400–700).
- Homepage animation relies on a single client component (`Reveal`); no image regressions identified (logos use explicit dimensions).

## Fixes applied

### Design tokens (`src/styles/globals.css`)

| Token | Before | After | Rationale |
| --- | --- | --- | --- |
| `--text-muted` | `#71717a` | `#9494a3` | ~5.5:1 on `#080810` (AA normal text) |
| `--accent` | `#8b5cf6` | `#a78bfa` | ~6.5:1 on `#080810` for accent labels |

Tokens updated at source; usages across footer, hero, participant links, and badges inherit the fix.

### Semantic list (`Principles.tsx`)

```html
<ol>
  <li>
    <Reveal><!-- animation wrapper inside li --></Reveal>
  </li>
</ol>
```

Screen readers announce a five-item ordered list. Animation preserved.

### Distinct CTA labels (`homepage.ts`)

| Label | Destination |
| --- | --- |
| JOIN KIRAKITAH | `/register` (hero, final CTA, header) |
| JOIN THE COMMUNITY | `/community` (community section) |

### Brand intro tags (`BrandIntro.tsx`)

- Replaced hidden `div` with labelled `<ul>` / `<li>`.
- Tags use `text-text-secondary` for AA contrast on `bg-surface/50`.

### Participant portal

- `ParticipantNav` — visible `focus-visible` ring on all nav links; semantic `<nav aria-label="Participant portal">`.
- Status labels already text-based (`PROFILE VERIFIED`, application/selection labels); no colour-only indicators changed.

### SEO protections

- `getSiteUrl()` normalizes `https://kirakitah.com` → `https://www.kirakitah.com` and defaults production to www when `NEXT_PUBLIC_SITE_URL` is unset.
- `OrganizationJsonLd` added with name, url, description, and slogan from published config only.

### Fonts

- Montserrat restricted to weights `400`, `500`, `600`, `700` with `display: swap`.

## Manual checks performed (code audit)

| Check | Result |
| --- | --- |
| Keyboard focusability | Native links/buttons; header mobile dialog uses `aria-expanded` |
| Visible focus indicators | Global `:focus-visible` outline; Button/BrandLogo/ParticipantNav rings |
| Interactive purpose/state | Distinct CTA labels; `aria-current="page"` on active nav |
| Tab order / DOM order | Landmarks: header, main, footer; no known traps |
| Dialog focus | Mobile nav dialog pattern present |
| HTML5 landmarks | `banner`, `main`, `contentinfo`, `nav` |
| Offscreen content | Decorative hero visuals `aria-hidden` |
| Custom control labels | Brand logo link `aria-label`; icon-only buttons use `sr-only` |
| ARIA | Prefer native HTML; no unnecessary roles added |

## Automated tests added

- `accessibility.test.tsx` — distinct CTA names, focus areas list, valid `ol > li` structure
- `participant-nav.test.tsx` — semantic nav, keyboard-reachable links, `aria-current`
- `site-url.test.ts` — www canonical normalization
- E2E — `JOIN THE COMMUNITY` visible on homepage

## Performance decisions

- No content hidden or lazy-loaded purely for Lighthouse.
- No removal of semantic HTML or meaningful ARIA.
- `Reveal` retained for scroll animation (single homepage client boundary).
- Vercel Analytics unchanged (Best Practices 100 preserved).

## Remaining limitations

Local Lighthouse (production build on `localhost:3000`, Aug 2026):

| Category | Score | Notes |
| --- | --- | --- |
| Performance | 96 | Local CPU/network variance; LCP/TBT on cold start |
| Accessibility | 100 | Contrast, list, and link audits pass |
| Best Practices | 96 | Vercel Analytics script 404 on localhost (`errors-in-console`) |
| SEO | 100 | Canonical, meta, robots unchanged |

Production PageSpeed should be re-run after deploy to `development` preview with `NEXT_PUBLIC_SITE_URL=https://www.kirakitah.com`. Analytics console noise does not occur on Vercel-hosted builds.

Post-implementation Lighthouse scores on production may differ from local runs.

## Related docs

- Participant tournament experience: `docs/backend/PARTICIPANT-TOURNAMENT-EXPERIENCE.md` (unchanged this phase — read-only portal behaviour preserved)
- Production env: `docs/deployment/PRODUCTION-ENV-MATRIX.md` — set `NEXT_PUBLIC_SITE_URL=https://www.kirakitah.com` on Vercel Production
