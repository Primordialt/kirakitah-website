# Registration Backend — Security Review (Step 3)

**Date:** August 23, 2026  
**Scope:** POST `/api/registrations`, verification layer, blob storage, PostgreSQL

---

## Summary

Step 3 hardens the registration pipeline with identity verification providers, contact verification architecture, and API security controls. No frontend changes were required.

---

## Controls in place

| Control | Status | Notes |
|---------|--------|-------|
| Server-side Zod validation | ✅ | All fields re-validated on API |
| Manual identity review (NIN + passport) | ✅ | Step 3A — no paid NIN API on submit |
| Automated NIN provider architecture | ✅ retained | Available architecturally; **not enabled for production** |
| Identification encryption (AES-256-GCM) | ✅ | At rest in PostgreSQL |
| Identification hash uniqueness | ✅ | Partial unique index per event |
| Player photo private blob storage | ✅ | Not in DB, not public |
| Rate limiting (IP + email) | ✅ | 5/hour IP, 3/day email |
| Duplicate active application check | ✅ | Email + identification hash |
| Guardian data separate table | ✅ | Not returned in public API |
| API security headers | ✅ | no-store, nosniff, no-referrer |
| Request body size limit | ✅ | 6 MB max |
| OTP challenges hashed | ✅ | Codes stored as SHA-256 hashes |
| Error sanitization | ✅ | No stack traces in production responses |

---

## Residual risks & recommendations

### High priority (before full production verification)

1. **Apply migrations** — `0000`, `0001`, and `0002_manual_identity_review.sql`.
2. **Admin review process** — Staff must verify NIN/passport offline before approving applicants (no dashboard in this step).
3. **Wire email/SMS provider** — Replace mock contact providers when credentials are available.

### Medium priority

4. **Admin review tooling** — Surface `pending_review` applications (Step 4+).
5. **Optional future NIN automation** — Enable authorized provider only when budget/credentials allow; keep registration path manual until then.
6. **Blob orphan cleanup** — If DB insert fails after blob upload, orphaned blobs should be garbage-collected.

### Low priority

7. **WAF / edge rate limiting** — Complement application-level limits with Vercel WAF or similar.
8. **Audit log table** — Structured audit events for status transitions and verification outcomes.

---

## Threat model notes

| Threat | Mitigation |
|--------|------------|
| Fake NIN submission | Authorized provider lookup + name match |
| Passport impersonation | Manual review required; no auto-verify |
| Email/phone not owned by applicant | OTP architecture ready; confirm before treating as verified |
| PII exposure in logs | Verification metadata excludes raw ID numbers |
| Photo public access | Vercel Blob `access: private` |
| Replay of registration | Duplicate + rate limits |
| Large payload DoS | 6 MB body limit |

---

## Verification checklist

- [ ] Migrations `0000`, `0001`, `0002` applied
- [ ] Registration submit does **not** call any NIN API
- [ ] New applications land with `identity_verification_status = pending_review`
- [ ] `GET /api/health` shows `identityVerificationMode: "manual"` and `automatedNinLookupEnabled: false`
- [ ] Social / Open Graph previews use purple KIRAKITAH mark (not white)
