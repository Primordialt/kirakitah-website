/** Authoritative contact-verification challenge lifecycle settings. */

export const VERIFICATION_CHALLENGE_TTL_MINUTES = 15;
export const VERIFICATION_CHALLENGE_TTL_MS =
  VERIFICATION_CHALLENGE_TTL_MINUTES * 60 * 1000;

export const VERIFICATION_MAX_ATTEMPTS = 5;

export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
export const VERIFICATION_RESEND_COOLDOWN_MS =
  VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;

/** Broader resend abuse protection (DB-backed, per application + channel). */
export const VERIFICATION_RESEND_MAX_PER_HOUR = 5;

/** Broader verify-attempt abuse protection (DB-backed, per application + channel). */
export const VERIFICATION_ATTEMPT_MAX_PER_HOUR = 30;

export const VERIFICATION_OTP_MIN = 100_000;
export const VERIFICATION_OTP_MAX = 1_000_000;
