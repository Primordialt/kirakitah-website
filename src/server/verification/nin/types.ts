import type { NinLookupResult } from "@/server/verification/types";

export interface NinVerificationRequest {
  nin: string;
  applicantFullName: string;
}

export interface INinVerificationProvider {
  readonly providerId: string;
  lookupByNin(request: NinVerificationRequest): Promise<NinLookupResult>;
}
