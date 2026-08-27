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
    const url = serverEnv.emailVerificationApiUrl;
    const apiKey = serverEnv.emailVerificationApiKey;

    if (!url || !apiKey) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Email verification provider is not configured.",
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
          // Never log this payload; may include OTP or reset URL for provider delivery only.
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

  async sendPasswordResetEmail(): Promise<DeliveryResult> {
    return {
      status: "unavailable",
      provider: this.providerId,
      message: "Email verification provider is not configured.",
    };
  }

  async sendLifecycleEmail(): Promise<DeliveryResult> {
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

  async sendPasswordResetEmail(): Promise<DeliveryResult> {
    return { status: "skipped", provider: this.providerId };
  }

  async sendLifecycleEmail(): Promise<DeliveryResult> {
    return { status: "skipped", provider: this.providerId };
  }
}
