import type { IPassportVerificationProvider, PassportVerificationRequest } from "./types";
import type { PassportLookupResult } from "@/server/verification/types";

/**
 * Passport numbers cannot be automatically verified without an authorized provider.
 * Applications using passport identification are flagged for manual admin review.
 * This provider never claims automated passport verification.
 */
export class StubPassportVerificationProvider implements IPassportVerificationProvider {
  readonly providerId = "manual-review";

  async assess(_request: PassportVerificationRequest): Promise<PassportLookupResult> {
    return {
      status: "manual_review_required",
      provider: this.providerId,
      message:
        "International passport identity requires manual verification by KIRAKITAH administrators.",
    };
  }
}
