# MVP registration smoke test — KIRAKITAH GAMING 926

**Audience:** Product Owner / ops after Production configuration  
**Mode:** `MVP_MANUAL_REVIEW`  
**Data:** synthetic / test data only — never real personal identity of real people  

Run against the **Production** host only after env + migrations are configured.  
Record pass/fail; do not announce registration publicly until all applicable tests pass.

---

## Preconditions

- [ ] Production deployment of intended commit is live
- [ ] `NEXT_PUBLIC_DATA_SOURCE=api`
- [ ] `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `REGISTRATION_PII_ENCRYPTION_KEY` set
- [ ] Migrations `0000`→`0010` applied
- [ ] KG926 tournament `status = registration_open` (if unknown, stop and verify)
- [ ] `/api/health` shows `registrationConfigured: true`

---

## TEST 1 — Adult registration

**Input:** Adult applicant (≥18), valid Nigeria contact fields, valid identification, valid photo (JPEG/PNG/WebP ≤ 5 MB).

**Expected:** SUCCESS  
- HTTP success from `POST /api/registrations`  
- Reference ID returned (e.g. `KG926-2026-XXXXXX`)  
- Success UI indicates application received / in the system for review  

**Record:** reference ID __________

---

## TEST 2 — Minor registration

**Input:** Age 10–17, complete guardian fields + guardian consent, valid photo.

**Expected:** SUCCESS when guardian data is valid  
- Reference ID returned  
- Guardian row persisted (verify via admin/DB; do not expose publicly)  

**Record:** reference ID __________

---

## TEST 3 — Underage applicant

**Input:** Age below 10.

**Expected:** REJECTED  
- Clear validation / policy error  
- No application row created  

---

## TEST 4 — Duplicate email

**Input:** Same email as TEST 1 (new identity / phone).

**Expected:** REJECTED  
- Duplicate / application-exists style error  

---

## TEST 5 — Duplicate phone

**Input:** Same phone as TEST 1 (new email / identity).

**Expected:** REJECTED  

---

## TEST 6 — Duplicate NIN / passport

**Input:** Same identification number as TEST 1 (new email / phone).

**Expected:** REJECTED  

---

## TEST 7 — Invalid photo

**Input:** Non-image file or mismatched MIME / corrupted header.

**Expected:** REJECTED  
- Photo validation error  
- No durable application (orphan Blob cleaned if upload briefly occurred)  

---

## TEST 8 — Oversized photo

**Input:** Image larger than 5 MB.

**Expected:** REJECTED  

---

## TEST 9 — Registration closed

**Setup:** Temporarily set tournament status away from `registration_open` (or use a closed event if available), then restore to `registration_open` after the test.

**Expected:** REJECTED  
- Server-side gate refuses submit  

**Restore:** Confirm KG926 is `registration_open` again before continuing.

---

## TEST 10 — Contact verification (MVP)

**Observe:** After TEST 1/2 success.

**Expected:** NO OTP / NO EMAIL / NO SMS under MVP mode  
- `email_verification_status` = `pending`  
- `phone_verification_status` = `pending`  
- No ownership challenge row created for contact OTP  
- Providers are not required to be configured for success  

---

## TEST 11 — Identity

**Observe:** Application from TEST 1.

**Expected:** `identity_verification_status` = `pending_review`  
- Provider = `manual`  
- No POSSAP / automated NIN / passport API call  
- Identification type, encrypted number, name, and private photo available only to authorized manual review  

---

## TEST 12 — Privacy

**Observe:** API response + success UI + applicant-facing pages.

**Expected:** no public photo URL  
- Response must not include Blob public URL  
- Applicant cannot open photo without admin-authorized access  
- No NIN/passport plaintext in response  
- No internal DB IDs / encryption ciphertext / OTP / admin secrets in response  

---

## Sign-off

| Item | Status |
|------|--------|
| Code completed | |
| Production configuration completed | |
| Live smoke test completed (this doc) | |
| Public announcement authorized | |

Tester: __________  
Date: __________  
Production commit SHA: __________  
