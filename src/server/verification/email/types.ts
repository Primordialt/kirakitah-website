import type {
  SendVerificationChallengeResult,
  VerifyChallengeResult,
} from "@/server/verification/types";

export interface EmailVerificationRequest {
  email: string;
  applicationId: string;
  referenceId: string;
}

export interface IEmailVerificationProvider {
  readonly providerId: string;
  sendChallenge(request: EmailVerificationRequest): Promise<SendVerificationChallengeResult>;
  verifyChallenge(
    challengeId: string,
    code: string,
  ): Promise<VerifyChallengeResult>;
}
