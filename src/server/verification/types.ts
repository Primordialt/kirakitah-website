import type { ApiErrorCode } from "@/server/errors";

export type IdentityVerificationOutcome =
  | "verified"
  | "mismatch"
  | "not_found"
  | "manual_review_required"
  | "provider_unavailable";

export type ContactVerificationChannel = "email" | "phone";

export type ContactChannelStatus =
  | "pending"
  | "verified"
  | "skipped"
  | "unavailable";

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

export interface DeliveryResult {
  status: "sent" | "unavailable" | "skipped";
  provider: string;
  message?: string;
}

/** @deprecated Prefer DeliveryResult — kept for older provider method signatures */
export type SendVerificationChallengeResult = DeliveryResult & {
  challengeId?: string;
};

export interface VerifyChallengeResult {
  status:
    | "verified"
    | "invalid"
    | "expired"
    | "too_many_attempts"
    | "already_used"
    | "not_found";
  message?: string;
  code?: ApiErrorCode;
}

export interface ContactChannelInitResult {
  status: ContactChannelStatus;
  challengeId?: string;
  provider: string;
  message?: string;
  resendAvailableAt?: string;
}
