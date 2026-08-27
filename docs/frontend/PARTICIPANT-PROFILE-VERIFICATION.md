# Participant Profile Verification Experience

Participant-facing documentation for Profile 2.0 (presentation and clarity). Authoritative backend statuses and completion rules are unchanged.

## Separation of concerns

```
ACCOUNT
  email · username · password · authentication
↓
PROFILE
  personal / contact / gaming / identity / documents
  completion % (server-authoritative)
  submission for review
↓
ADMIN REVIEW
  VERIFY PROFILE · REQUEST CORRECTION
↓
VERIFIED PROFILE
↓
TOURNAMENT APPLICATION
  eligibility · social verification · application status
↓
SELECTION → QUALIFICATION → MATCHES → RESULTS
```

**Account ≠ Profile ≠ Application.** Profile verification does **not** mean eligibility, selection, or qualification.

## Participant-visible profile statuses

Backend statuses (unchanged):

| Status | Participant label |
| --- | --- |
| `incomplete` | INCOMPLETE (or READY TO SUBMIT when completion is 100%) |
| `submitted_for_review` | UNDER REVIEW |
| `needs_correction` | NEEDS CORRECTION |
| `verified` | VERIFIED |

## Completion

- Calculated only on the server (`src/server/participant/profile/completion.ts`).
- Required adult fields: first/last name, DOB, country, city, phone, ID type + number, eFootball username, player photo.
- Guardian section appears only when DOB requires a guardian.
- UI shows section breakdown (Complete / Incomplete) from `completionSections` on the profile view.
- Client percentage is never trusted for submission.

## Save vs submit

| Action | Meaning |
| --- | --- |
| SAVE PROFILE | Persist draft progress. Does **not** start admin review. |
| SUBMIT FOR VERIFICATION | Send a **complete** profile for administrator review. |

Incomplete profiles cannot be submitted. Editing after `needs_correction` returns status to `incomplete` (existing service behaviour).

## Sensitive identity

- Identification numbers are stored hashed/encrypted.
- Participant UI shows **On file** after save rather than re-displaying the full value.
- Admin notes / `verifiedBy` / audit internals are not participant-visible.
- `correctionReason` is participant-visible by design (public-safe).

## Application gate

Server gate remains authoritative (`application-gate.ts`).

| Profile state | Apply CTA presentation |
| --- | --- |
| Incomplete | COMPLETE PROFILE |
| Complete, not submitted | SUBMIT PROFILE |
| Under review | PROFILE UNDER REVIEW |
| Needs correction | UPDATE PROFILE |
| Verified | APPLY FOR TOURNAMENT |

Eligibility and selection engines are unchanged (`kg926-v3`).

## Admin review

- Route: `/admin/reviews/profiles`
- Permission: `identity:review` (SUPER_ADMIN, REVIEWER — not SUPPORT)
- Actions: VERIFY PROFILE · REQUEST CORRECTION
- Incomplete profiles cannot be verified (UI + existing server checks)

## Timeline

Optional participant timeline uses only existing `submittedAt` / `verifiedAt` / status. No new audit UI or history table.

## Related code

- Presentation: `src/lib/participant/profile-presentation.ts`
- Dashboard card: `src/components/features/participant/ProfileStatusCard.tsx`
- Profile form: `src/components/features/participant/ProfileForm.tsx`
- Service: `src/server/participant/profile/service.ts`
