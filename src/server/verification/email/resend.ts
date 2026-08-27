import { serverEnv } from "@/server/env";
import { buildEmailVerificationTemplate } from "@/server/verification/templates/contact-verification";
import { buildPasswordResetTemplate } from "@/server/verification/templates/password-reset";
import type {
  IEmailDeliveryProvider,
  EmailDeliveryRequest,
  PasswordResetEmailRequest,
  LifecycleEmailRequest,
} from "./types";
import type { DeliveryResult } from "@/server/verification/types";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Production email delivery via Resend.
 * Delivery-only — OTP lifecycle remains in contact challenges.
 * Never logs API keys, OTP codes, reset tokens, or email bodies.
 */
export class ResendEmailDeliveryProvider implements IEmailDeliveryProvider {
  readonly providerId = "resend";

  async sendVerificationEmail(
    request: EmailDeliveryRequest,
  ): Promise<DeliveryResult> {
    const template = buildEmailVerificationTemplate({
      referenceId: request.referenceId,
      code: request.code,
      expiresInMinutes: request.expiresInMinutes,
      recipientFirstName: request.recipientFirstName,
    });

    return this.send({
      to: request.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendPasswordResetEmail(
    request: PasswordResetEmailRequest,
  ): Promise<DeliveryResult> {
    const template = buildPasswordResetTemplate({
      resetUrl: request.resetUrl,
      expiresInHours: request.expiresInHours,
    });

    return this.send({
      to: request.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendLifecycleEmail(
    request: LifecycleEmailRequest,
  ): Promise<DeliveryResult> {
    return this.send({
      to: request.email,
      subject: request.subject,
      text: request.text,
      html: request.html,
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<DeliveryResult> {
    const apiKey = serverEnv.resendApiKey;
    if (!apiKey) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Email verification provider is not configured.",
      };
    }

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: serverEnv.emailFrom,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
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
