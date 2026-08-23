# Production launch documentation index — KIRAKITAH GAMING 926

| Document | Purpose |
|----------|---------|
| [PRODUCTION-ENV-MATRIX.md](./PRODUCTION-ENV-MATRIX.md) | Definitive environment variable matrix |
| [PRODUCTION-MIGRATIONS.md](./PRODUCTION-MIGRATIONS.md) | Migration order and apply/verify steps |
| [VERCEL-PRODUCTION-CHECKLIST.md](./VERCEL-PRODUCTION-CHECKLIST.md) | Vercel Production operator checklist |
| [NEON-PRODUCTION-CHECKLIST.md](./NEON-PRODUCTION-CHECKLIST.md) | Neon database operator checklist |
| [VERCEL-BLOB-CHECKLIST.md](./VERCEL-BLOB-CHECKLIST.md) | Private Blob photo storage checklist |
| [ENCRYPTION-KEY.md](./ENCRYPTION-KEY.md) | PII encryption key format and handling |
| [EMAIL-PROVIDER-SETUP.md](./EMAIL-PROVIDER-SETUP.md) | Email HTTP contract (delivery blocked until tested) |
| [SMS-PROVIDER-SETUP.md](./SMS-PROVIDER-SETUP.md) | SMS HTTP contract (delivery blocked until tested) |
| [ADMIN-AUTH-SETUP.md](./ADMIN-AUTH-SETUP.md) | Admin auth contract (blocked until real provider) |
| [REGISTRATION-PRODUCTION-SMOKE-TEST.md](./REGISTRATION-PRODUCTION-SMOKE-TEST.md) | Synthetic smoke tests |
| [REGISTRATION-LAUNCH-CHECKLIST.md](./REGISTRATION-LAUNCH-CHECKLIST.md) | Final launch gate checklist |
| [PRODUCT-DECISIONS-BEFORE-LAUNCH.md](./PRODUCT-DECISIONS-BEFORE-LAUNCH.md) | Unresolved Product Owner decisions |

## Authoritative runtime checks

- Public: `GET /api/health` (safe booleans; no secrets; no paid provider calls)
- Admin: `GET /api/admin/system/readiness` (auth + RBAC; statuses `CONFIGURED` / `NOT_CONFIGURED` / `ERROR` / `PENDING_PRODUCT_DECISION`)

Identity verification remains **manual only**.
