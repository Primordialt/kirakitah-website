import type { PassportLookupResult } from "@/server/verification/types";

export interface PassportVerificationRequest {
  passportNumber: string;
  applicantFullName: string;
}

export interface IPassportVerificationProvider {
  readonly providerId: string;
  assess(request: PassportVerificationRequest): Promise<PassportLookupResult>;
}
