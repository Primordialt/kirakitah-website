# Participant Portal UX

Authenticated participant experience for KIRAKITAH accounts.

## Architecture

Public website (`(site)` route group) keeps the global Header/Footer marketing shell.

Authenticated participant pages live under the `(portal)` route group with
`ParticipantPortalShell`:

- Portal header: KIRAKITAH · Participant Portal · identity · verified badge · alerts · menu
- Desktop: sidebar navigation
- Mobile: header menu drawer with Escape close + focusable controls
- Compact portal footer with link back to the public website

Primary navigation:

- Dashboard
- Profile
- Tournaments
- Matches
- Notifications
- Account

Current page uses `aria-current="page"`.

## Dashboard hierarchy

P0 Required action / profile status  
P1 Identity + verified badge  
P2 Tournament summary  
P3 Recent notifications  

Detailed tournament/match/notification content stays on dedicated pages.

## Verified badge

`VerifiedBadge` is purple (`brand-primary`) with accessible label
**Verified participant**.

It represents **profile verified** only (`participant_profiles.status === "verified"`).

It does **not** mean email verified, selected, qualified, or eligible.

## Account settings (`/account`)

- Username / email / account status
- Profile verification summary
- Password reset link
- Delete account (typed `DELETE` confirmation)

## Mobile-first

Designed for ~390×844 first; one-column layouts, large CTAs, no reliance on
hover-only interactions.
