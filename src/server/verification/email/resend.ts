import { serverEnv } from "@/server/env";
import { buildEmailVerificationTemplate } from "@/server/verification/templates/contact-verification";
import type { IEmailDeliveryProvider, EmailDeliveryRequest } from "./types";
import type { DeliveryResult } from "@/server/verification/types";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Production email delivery via Resend.
 * Delivery-only — OTP lifecycle remains in contact challenges.
 * Never logs API keys, OTP codes, or email bodies.
 */
export class ResendEmailDeliveryProvider implements IEmailDeliveryProvider {
  readonly providerId = "resend";

  async sendVerificationEmail(
    request: EmailDeliveryRequest,
  ): Promise<DeliveryResult> {
    const apiKey = serverEnv.resendApiKey;
    if (!apiKey) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Email verification provider is not configured.",
      };
    }

    const template = buildEmailVerificationTemplate({
      referenceId: request.referenceId,
      code: request.code,
      expiresInMinutes: request.expiresInMinutes,
      recipientFirstName: request.recipientFirstName,
    });

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: serverEnv.emailFrom,
          to: [request.email],
          subject: template.subject,
          text: template.text,
          html: template.html,
        }),
      });

      if (!response.ok) {
        // Safe diagnostic only — never log response body (may echo content) or keys.
        if (serverEnv.nodeEnv !== "test") {
          console.error(
            JSON.stringify({
              level: "error",
              event: "email.delivery.failed",
              provider: this.providerId,
              httpStatus: response.status,
              category: "provider_rejected",
            }),
          );
        }
        return {
          status: "unavailable",
          provider: this.providerId,
          message: "Email delivery provider rejected the request.",
        };
      }

      return { status: "sent", provider: this.providerId };
    } catch {
      if (serverEnv.nodeEnv !== "test") {
        console.error(
          JSON.stringify({
            level: "error",
            event: "email.delivery.failed",
            provider: this.providerId,
            category: "network_failure",
          }),
        );
      }
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Email delivery provider is unavailable.",
      };
    }
  }
}
