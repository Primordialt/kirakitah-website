import type { IdentityVerificationResult } from "@/server/verification/types";

export type IdentityVerificationStatus =
  | "pending_review"
  | "verified"
  | "manual_review"
  | "rejected"
  | "mismatch"
  | "not_found"
  | "provider_unavailable";

/**
 * Maps automated provider outcomes when that path is optionally enabled later.
 * Production registration does not call providers — it persists `pending_review`.
 */
export function mapIdentityOutcomeToStatus(
  outcome: IdentityVerificationResult["outcome"],
): IdentityVerificationStatus {
  switch (outcome) {
    case "verified":
      return "verified";
    case "manual_review_required":
      return "pending_review";
    case "mismatch":
      return "mismatch";
    case "not_found":
      return "not_found";
    case "provider_unavailable":
    default:
      return "provider_unavailable";
  }
}
