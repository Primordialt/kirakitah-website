import type { DeliveryResult } from "@/server/verification/types";

export interface PhoneDeliveryRequest {
  phone: string;
  referenceId: string;
  code: string;
  expiresInMinutes: number;
}

/**
 * Delivery-only SMS provider.
 * Challenge persistence is owned by the contact challenge lifecycle service.
 */
export interface IPhoneDeliveryProvider {
  readonly providerId: string;
  sendVerificationSms(request: PhoneDeliveryRequest): Promise<DeliveryResult>;
}

/** @deprecated Use IPhoneDeliveryProvider */
export type IPhoneVerificationProvider = IPhoneDeliveryProvider & {
  sendChallenge?(request: {
    phone: string;
    applicationId: string;
    referenceId: string;
  }): Promise<DeliveryResult & { challengeId?: string }>;
  verifyChallenge?(
    challengeId: string,
    code: string,
  ): Promise<{ status: string; message?: string }>;
};
