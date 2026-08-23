export type IdentityVerificationOutcome =
  | "verified"
  | "mismatch"
  | "not_found"
  | "manual_review_required"
  | "provider_unavailable";

export type ContactVerificationChannel = "email" | "phone";

export type ContactVerificationStatus = "pending" | "verified" | "expired" | "failed";

export interface IdentityVerificationResult {
  outcome: IdentityVerificationOutcome;
  provider: string;
  checkedAt: string;
  /** Never include raw identification numbers in this metadata */
  details?: string;
}

export interface NinLookupResult {
  status: "found" | "not_found" | "unavailable" | "error";
  verifiedFullName?: string;
  provider: string;
  message?: string;
}

export interface PassportLookupResult {
  status: "manual_review_required" | "unavailable";
  provider: string;
  message: string;
}

export interface SendVerificationChallengeResult {
  status: "sent" | "skipped" | "unavailable";
  provider: string;
  challengeId?: string;
  message?: string;
}

export interface VerifyChallengeResult {
  status: "verified" | "invalid" | "expired" | "too_many_attempts";
  message?: string;
}
