import { COMPETITION_NAME } from "@/config/competition";
import { VERIFICATION_CHALLENGE_TTL_MINUTES } from "@/server/verification/constants";

export interface EmailVerificationTemplateInput {
  referenceId: string;
  code: string;
  expiresInMinutes?: number;
  recipientFirstName?: string;
}

export interface EmailVerificationTemplate {
  subject: string;
  text: string;
  html: string;
}

function safeFirstName(value: string | undefined): string | null {
  if (!value) return null;
  const first = value.trim().split(/\s+/)[0];
  if (!first || first.length > 40) return null;
  // Block accidental PII-looking tokens in greeting.
  if (/nin|passport|guardian|phone|email/i.test(first)) return null;
  return first;
}

/**
 * Transactional email for contact ownership verification.
 * Must never include NIN, passport, DOB, guardian data, or identity review status.
 */
export function buildEmailVerificationTemplate(
  input: EmailVerificationTemplateInput,
): EmailVerificationTemplate {
  const expiresInMinutes =
    input.expiresInMinutes ?? VERIFICATION_CHALLENGE_TTL_MINUTES;
  const subject = `${COMPETITION_NAME} — Verify Your Email`;
  const greetingName = safeFirstName(input.recipientFirstName);
  const greeting = greetingName ? `Hi ${greetingName},` : "Hi,";

  const text = [
    greeting,
    "",
    `Use the verification code below to confirm your email address for your ${COMPETITION_NAME} application.`,
    "",
    input.code,
    "",
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request this code, you can ignore this email.",
    "",
    "KIRAKITAH",
    "PLAY. COMPETE. CREATE.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5;">
    <p>${greeting}</p>
    <p>Use the verification code below to confirm your email address for your ${COMPETITION_NAME} application.</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 0.12em;">${input.code}</p>
    <p>This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p>If you did not request this code, you can ignore this email.</p>
    <p style="margin-top: 24px;"><strong>KIRAKITAH</strong><br/>PLAY. COMPETE. CREATE.</p>
  </body>
</html>
`.trim();

  return { subject, text, html };
}

export function buildPhoneVerificationSms(input: {
  code: string;
  expiresInMinutes?: number;
}): string {
  const expiresInMinutes =
    input.expiresInMinutes ?? VERIFICATION_CHALLENGE_TTL_MINUTES;
  return `Your ${COMPETITION_NAME} verification code is ${input.code}. It expires in ${expiresInMinutes} minutes. Do not share this code.`;
}
