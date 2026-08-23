# Product decisions before launch — KIRAKITAH GAMING 926

Do not implement silent defaults for these items. Mark each decision explicitly before public registration opens.

| # | Decision | Status |
|---|----------|--------|
| 1 | Is **email verification** mandatory for eligibility / participation progression? | **PENDING PRODUCT OWNER DECISION** |
| 2 | Is **phone verification** mandatory for eligibility / participation progression? | **PENDING PRODUCT OWNER DECISION** |
| 3 | What happens when **128** applications / entrants are reached? Auto-reject? Soft cap? Continue accepting? | **PENDING PRODUCT OWNER DECISION** (`CAPACITY_POLICY_PENDING` in code) |
| 4 | Is there a **waitlist**? | **PENDING PRODUCT OWNER DECISION** (do not invent) |
| 5 | **Registration data retention** period and deletion process | **PENDING PRODUCT / LEGAL POLICY** |
| 6 | **Privacy policy** content accurately describing collected PII (email, phone, DOB, identity number, photo, guardian data) | **PENDING PRODUCT / LEGAL** — do not claim legal compliance if placeholder |
| 7 | Should `/esports/register` be **indexed** by search engines (`noindex` or keep in sitemap)? | **PENDING PRODUCT OWNER DECISION** |
| 8 | **Guardian verification** policy (OTP or other) for ages 10–17 | **PENDING PRODUCT OWNER DECISION** (not inventing requirements) |
| 9 | Final **application approval** criteria vs identity approval vs participant selection | **PENDING PRODUCT OWNER DECISION** (keep concepts separate in the system) |
| 10 | Chosen **email** transactional provider + sender domain | **PENDING PRODUCT OWNER DECISION** |
| 11 | Chosen **SMS** provider + sender ID | **PENDING PRODUCT OWNER DECISION** |
| 12 | Chosen **admin authentication** / SSO provider + initial admin roster | **PENDING PRODUCT OWNER DECISION** |

## Related system statuses

- Identity verification mode: **manual** (not a Product decision to automate for launch)
- Automated NIN / passport / POSSAP: **disabled**
- Launch gate will not report `REGISTRATION_READY` while required infrastructure/providers are incomplete
