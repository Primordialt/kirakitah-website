import { serverEnv } from "@/server/env";
import { buildPhoneVerificationSms } from "@/server/verification/templates/contact-verification";
import type { IPhoneDeliveryProvider, PhoneDeliveryRequest } from "./types";
import type { DeliveryResult } from "@/server/verification/types";

/**
 * Development / CI / test SMS delivery only.
 * Must never be used in production.
 */
export class MockPhoneDeliveryProvider implements IPhoneDeliveryProvider {
  readonly providerId = "mock";

  async sendVerificationSms(
    request: PhoneDeliveryRequest,
  ): Promise<DeliveryResult> {
    if (!serverEnv.allowMockContactProviders) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Mock phone provider cannot operate in production.",
      };
    }

    const message = buildPhoneVerificationSms({
      code: request.code,
      expiresInMinutes: request.expiresInMinutes,
    });

    if (serverEnv.nodeEnv === "development") {
      console.info(
        `[mock-phone-verification] reference=${request.referenceId} message=${message}`,
      );
    }

    return { status: "sent", provider: this.providerId };
  }
}

/** @deprecated Prefer MockPhoneDeliveryProvider */
export const MockPhoneVerificationProvider = MockPhoneDeliveryProvider;
