import type {
  SendVerificationChallengeResult,
  VerifyChallengeResult,
} from "@/server/verification/types";

export interface PhoneVerificationRequest {
  phone: string;
  applicationId: string;
  referenceId: string;
}

export interface IPhoneVerificationProvider {
  readonly providerId: string;
  sendChallenge(request: PhoneVerificationRequest): Promise<SendVerificationChallengeResult>;
  verifyChallenge(
    challengeId: string,
    code: string,
  ): Promise<VerifyChallengeResult>;
}
