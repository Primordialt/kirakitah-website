import { serverEnv } from "@/server/env";
import { buildEmailVerificationTemplate } from "@/server/verification/templates/contact-verification";
import type { IEmailDeliveryProvider, EmailDeliveryRequest } from "./types";
import type { DeliveryResult } from "@/server/verification/types";

/**
 * Authorized HTTP email delivery for production.
 * Requires EMAIL_VERIFICATION_API_URL and EMAIL_VERIFICATION_API_KEY.
 * Does not invent credentials — fails closed when unset.
 */
export class HttpEmailDeliveryProvider implements IEmailDeliveryProvider {
  readonly providerId = "http";

  async sendVerificationEmail(
    request: EmailDeliveryRequest,
  ): Promise<DeliveryResult> {
    const url = serverEnv.emailVerificationApiUrl;
    const apiKey = serverEnv.emailVerificationApiKey;

    if (!url || !apiKey) {
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
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: request.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
          // Never log this payload; code is intentionally included for provider delivery only.
        }),
      });

      if (!response.ok) {
        return {
          status: "unavailable",
          provider: this.providerId,
          message: "Email delivery provider rejected the request.",
        };
      }

      return { status: "sent", provider: this.providerId };
    } catch {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Email delivery provider is unavailable.",
      };
    }
  }
}

export class UnavailableEmailDeliveryProvider implements IEmailDeliveryProvider {
  readonly providerId = "unavailable";

  async sendVerificationEmail(): Promise<DeliveryResult> {
    return {
      status: "unavailable",
      provider: this.providerId,
      message: "Email verification provider is not configured.",
    };
  }
}

export class SkippedEmailDeliveryProvider implements IEmailDeliveryProvider {
  readonly providerId = "none";

  async sendVerificationEmail(): Promise<DeliveryResult> {
    return { status: "skipped", provider: this.providerId };
  }
}
