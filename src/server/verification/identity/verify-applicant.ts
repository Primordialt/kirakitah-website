import { namesMatch } from "@/lib/name-matching";
import type { IdentificationType } from "@/lib/identification";
import { getVerificationProviders } from "@/server/verification";
import type { IdentityVerificationResult } from "@/server/verification/types";

export class IdentityVerificationError extends Error {
  constructor(
    message: string,
    public readonly outcome: IdentityVerificationResult["outcome"],
  ) {
    super(message);
    this.name = "IdentityVerificationError";
  }
}

export interface VerifyApplicantIdentityInput {
  identificationType: IdentificationType;
  identificationNumber: string;
  fullName: string;
}

export async function verifyApplicantIdentity(
  input: VerifyApplicantIdentityInput,
): Promise<IdentityVerificationResult> {
  const providers = getVerificationProviders();
  const checkedAt = new Date().toISOString();

  if (input.identificationType === "passport") {
    const passportResult = await providers.passport.assess({
      passportNumber: input.identificationNumber,
      applicantFullName: input.fullName,
    });

    return {
      outcome: "manual_review_required",
      provider: passportResult.provider,
      checkedAt,
      details: passportResult.message,
    };
  }

  const lookup = await providers.nin.lookupByNin({
    nin: input.identificationNumber,
    applicantFullName: input.fullName,
  });

  if (lookup.status === "unavailable" || lookup.status === "error") {
    return {
      outcome: "provider_unavailable",
      provider: lookup.provider,
      checkedAt,
      details: lookup.message,
    };
  }

  if (lookup.status === "not_found") {
    return {
      outcome: "not_found",
      provider: lookup.provider,
      checkedAt,
      details: "NIN could not be verified",
    };
  }

  if (!lookup.verifiedFullName || !namesMatch(input.fullName, lookup.verifiedFullName)) {
    return {
      outcome: "mismatch",
      provider: lookup.provider,
      checkedAt,
      details: "Provided full name does not match NIN records",
    };
  }

  return {
    outcome: "verified",
    provider: lookup.provider,
    checkedAt,
  };
}

export function assertIdentityVerificationAllowed(
  result: IdentityVerificationResult,
): void {
  if (result.outcome === "verified" || result.outcome === "manual_review_required") {
    return;
  }

  if (result.outcome === "mismatch") {
    throw new IdentityVerificationError(
      "The full name provided does not match the name registered to this NIN.",
      result.outcome,
    );
  }

  if (result.outcome === "not_found") {
    throw new IdentityVerificationError(
      "The NIN provided could not be verified.",
      result.outcome,
    );
  }

  throw new IdentityVerificationError(
    "Identity verification is temporarily unavailable. Please try again later.",
    result.outcome,
  );
}
