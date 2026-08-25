/**
 * KIRAKITAH GAMING 926 registration operating policy.
 *
 * Product Owner decision (emergency MVP launch):
 * Accept public applications now with manual identity review.
 * Defer email OTP and phone OTP.
 * Production admin authentication is enabled (database password auth).
 *
 * Switch REGISTRATION_OPERATING_MODE to "FULL_PRODUCTION" only after
 * real email/SMS providers are configured and tested.
 *
 * @see docs/deployment/MVP-MANUAL-REGISTRATION.md
 */

export type RegistrationOperatingMode = "MVP_MANUAL_REVIEW" | "FULL_PRODUCTION";

export type ContactVerificationPolicy = "DEFERRED" | "REQUIRED";

export type IdentityVerificationPolicy = "MANUAL";

export type AdminWorkflowPolicy = "MANUAL_DEFERRED_AUTH" | "SECURE_PROVIDER";

/**
 * Deliberate Product Owner launch mode for KG926.
 * Change only via explicit code review — not a hidden env flag.
 */
export const REGISTRATION_OPERATING_MODE: RegistrationOperatingMode =
  "MVP_MANUAL_REVIEW";

export const registrationPolicy = {
  mode: REGISTRATION_OPERATING_MODE as RegistrationOperatingMode,

  /** Applications are accepted without email/phone OTP in MVP mode. */
  contactVerification: (REGISTRATION_OPERATING_MODE === "MVP_MANUAL_REVIEW"
    ? "DEFERRED"
    : "REQUIRED") as ContactVerificationPolicy,

  /** Always manual for KG926 — no automated NIN/passport/POSSAP. */
  identityVerification: "MANUAL" as IdentityVerificationPolicy,

  /** Production admin login uses database password authentication. */
  adminWorkflow: "SECURE_PROVIDER" as AdminWorkflowPolicy,

  /**
   * Whether submit must initiate email/phone OTP delivery.
   * Deferred = collect contacts + pending status; do not send OTP; do not fake verified.
   */
  get initiateContactVerificationOnSubmit(): boolean {
    return this.contactVerification === "REQUIRED";
  },

  get isMvpManualReview(): boolean {
    return this.mode === "MVP_MANUAL_REVIEW";
  },

  get isFullProduction(): boolean {
    return this.mode === "FULL_PRODUCTION";
  },
};

export type RegistrationPolicy = typeof registrationPolicy;
