/** Shared participant session cookie name (safe for Edge middleware). */
export const PARTICIPANT_SESSION_COOKIE = "kirakitah_participant_session";

/**
 * Synthetic event id for account-signup email challenges.
 * Challenge rows are not tied to an application, but duplicate checks still
 * consult live KG926 applications (`event-kg926`) plus participant accounts.
 */
export const PARTICIPANT_ACCOUNT_EMAIL_CHALLENGE_EVENT_ID =
  "participant-account-signup";
