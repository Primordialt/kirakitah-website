import { serverEnv } from "@/server/env";
import {
  buildEmailVerificationTemplate,
} from "@/server/verification/templates/contact-verification";
import type { IEmailDeliveryProvider, EmailDeliveryRequest } from "./types";
import type { DeliveryResult } from "@/server/verification/types";

/**
 * Development / CI / test email delivery only.
 * Must never be used in production.
 */
export class MockEmailDeliveryProvider implements IEmailDeliveryProvider {
  readonly providerId = "mock";

  async sendVerificationEmail(
    request: EmailDeliveryRequest,
  ): Promise<DeliveryResult> {
    if (serverEnv.isProduction) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Mock email provider cannot operate in production.",
      };
    }

    const template = buildEmailVerificationTemplate({
      referenceId: request.referenceId,
      code: request.code,
      expiresInMinutes: request.expiresInMinutes,
    });

    // OTP may be logged only outside production (development / tests).
    if (serverEnv.nodeEnv === "development") {
      console.info(
        `[mock-email-verification] reference=${request.referenceId} subject=${template.subject} code=${request.code}`,
      );
    }

    return { status: "sent", provider: this.providerId };
  }
}

/** @deprecated Prefer MockEmailDeliveryProvider */
export const MockEmailVerificationProvider = MockEmailDeliveryProvider;
