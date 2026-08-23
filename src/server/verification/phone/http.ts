import { serverEnv } from "@/server/env";
import { buildPhoneVerificationSms } from "@/server/verification/templates/contact-verification";
import type { IPhoneDeliveryProvider, PhoneDeliveryRequest } from "./types";
import type { DeliveryResult } from "@/server/verification/types";

/**
 * Authorized HTTP SMS delivery for production.
 * Requires PHONE_VERIFICATION_API_URL and PHONE_VERIFICATION_API_KEY.
 * Does not invent credentials — fails closed when unset.
 */
export class HttpPhoneDeliveryProvider implements IPhoneDeliveryProvider {
  readonly providerId = "http";

  async sendVerificationSms(
    request: PhoneDeliveryRequest,
  ): Promise<DeliveryResult> {
    const url = serverEnv.phoneVerificationApiUrl;
    const apiKey = serverEnv.phoneVerificationApiKey;

    if (!url || !apiKey) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Phone verification provider is not configured.",
      };
    }

    const body = buildPhoneVerificationSms({
      code: request.code,
      expiresInMinutes: request.expiresInMinutes,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: request.phone,
          message: body,
        }),
      });

      if (!response.ok) {
        return {
          status: "unavailable",
          provider: this.providerId,
          message: "SMS delivery provider rejected the request.",
        };
      }

      return { status: "sent", provider: this.providerId };
    } catch {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "SMS delivery provider is unavailable.",
      };
    }
  }
}

export class UnavailablePhoneDeliveryProvider implements IPhoneDeliveryProvider {
  readonly providerId = "unavailable";

  async sendVerificationSms(): Promise<DeliveryResult> {
    return {
      status: "unavailable",
      provider: this.providerId,
      message: "Phone verification provider is not configured.",
    };
  }
}

export class SkippedPhoneDeliveryProvider implements IPhoneDeliveryProvider {
  readonly providerId = "none";

  async sendVerificationSms(): Promise<DeliveryResult> {
    return { status: "skipped", provider: this.providerId };
  }
}
