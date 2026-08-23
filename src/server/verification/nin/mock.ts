import { namesMatch } from "@/lib/name-matching";
import type { INinVerificationProvider, NinVerificationRequest } from "./types";
import type { NinLookupResult } from "@/server/verification/types";

/**
 * Test double for local development and CI.
 * Returns a synthetic verified name derived from the applicant unless
 * NIN ends with "9999" (simulates not found) or "0000" (simulates mismatch).
 */
export class MockNinVerificationProvider implements INinVerificationProvider {
  readonly providerId = "mock";

  async lookupByNin(request: NinVerificationRequest): Promise<NinLookupResult> {
    if (request.nin.endsWith("9999")) {
      return {
        status: "not_found",
        provider: this.providerId,
        message: "NIN not found (mock)",
      };
    }

    if (request.nin.endsWith("0000")) {
      return {
        status: "found",
        verifiedFullName: "Different Registered Name",
        provider: this.providerId,
      };
    }

    return {
      status: "found",
      verifiedFullName: request.applicantFullName,
      provider: this.providerId,
    };
  }
}

export function mockNinNamesMatch(
  request: NinVerificationRequest,
  verifiedFullName: string,
): boolean {
  return namesMatch(request.applicantFullName, verifiedFullName);
}
