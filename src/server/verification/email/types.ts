import type { DeliveryResult } from "@/server/verification/types";

export interface EmailDeliveryRequest {
  email: string;
  referenceId: string;
  code: string;
  expiresInMinutes: number;
  /** Optional first name for greeting only — never NIN/phone/guardian. */
  recipientFirstName?: string;
}

export interface PasswordResetEmailRequest {
  email: string;
  resetUrl: string;
  expiresInHours: number;
}

/**
 * Delivery-only email provider.
 * Challenge persistence is owned by the contact challenge lifecycle service.
 * Password reset tokens are owned by participant auth — never log plaintext tokens.
 */
export interface IEmailDeliveryProvider {
  readonly providerId: string;
  sendVerificationEmail(request: EmailDeliveryRequest): Promise<DeliveryResult>;
  sendPasswordResetEmail(
    request: PasswordResetEmailRequest,
  ): Promise<DeliveryResult>;
}

/** @deprecated Use IEmailDeliveryProvider */
export type IEmailVerificationProvider = IEmailDeliveryProvider & {
  sendChallenge?(request: {
    email: string;
    applicationId: string;
    referenceId: string;
  }): Promise<DeliveryResult & { challengeId?: string }>;
  verifyChallenge?(
    challengeId: string,
    code: string,
  ): Promise<{ status: string; message?: string }>;
};
