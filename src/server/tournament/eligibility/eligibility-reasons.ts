/** Controlled eligibility reason codes — never use raw DB errors. */
export const ELIGIBILITY_REASON_CODES = [
  "AGE_BELOW_MINIMUM",
  "APPLICATION_NOT_APPROVED",
  "APPLICATION_REJECTED",
  "APPLICATION_WITHDRAWN",
  "IDENTITY_PENDING",
  "IDENTITY_REJECTED",
  "EMAIL_NOT_VERIFIED",
  "PHONE_NOT_VERIFIED",
  "GUARDIAN_INFORMATION_MISSING",
  "GUARDIAN_CONSENT_MISSING",
  "TOURNAMENT_REGISTRATION_CLOSED",
  "TOURNAMENT_REGISTRATION_NOT_OPEN",
  "ALREADY_SELECTED",
  "TOURNAMENT_NOT_FOUND",
  "APPLICATION_NOT_FOUND",
] as const;

export type EligibilityReasonCode = (typeof ELIGIBILITY_REASON_CODES)[number];

export const ELIGIBILITY_REASON_LABELS: Record<EligibilityReasonCode, string> = {
  AGE_BELOW_MINIMUM: "Applicant is below the minimum tournament age.",
  APPLICATION_NOT_APPROVED: "Application has not been approved for selection.",
  APPLICATION_REJECTED: "Application was rejected.",
  APPLICATION_WITHDRAWN: "Application was withdrawn.",
  IDENTITY_PENDING: "Identity review is pending.",
  IDENTITY_REJECTED: "Identity review was rejected.",
  EMAIL_NOT_VERIFIED: "Email ownership verification is required but not complete.",
  PHONE_NOT_VERIFIED: "Phone ownership verification is required but not complete.",
  GUARDIAN_INFORMATION_MISSING: "Guardian information is required but missing.",
  GUARDIAN_CONSENT_MISSING: "Guardian consent is required but missing.",
  TOURNAMENT_REGISTRATION_CLOSED: "Tournament registration is closed.",
  TOURNAMENT_REGISTRATION_NOT_OPEN: "Tournament registration is not yet open.",
  ALREADY_SELECTED: "Applicant is already selected for this tournament.",
  TOURNAMENT_NOT_FOUND: "Tournament was not found.",
  APPLICATION_NOT_FOUND: "Application was not found.",
};
