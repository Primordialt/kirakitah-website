import { COMPETITION_NAME } from "@/config/competition";
import { VERIFICATION_CHALLENGE_TTL_MINUTES } from "@/server/verification/constants";

export interface EmailVerificationTemplateInput {
  referenceId: string;
  code: string;
  expiresInMinutes?: number;
}

export interface EmailVerificationTemplate {
  subject: string;
  text: string;
  html: string;
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

  const text = [
    COMPETITION_NAME,
    "",
    "Enter this code to verify the email address on your application.",
    "",
    `Verification code: ${input.code}`,
    "",
    `This code expires in ${expiresInMinutes} minutes.`,
    "Do not share this code with anyone.",
    "",
    `Application reference: ${input.referenceId}`,
    "",
    "Verifying your email confirms contact ownership only.",
    "It does not confirm tournament participation.",
    "",
    "If you did not submit this application, you can ignore this message.",
    "Support: use the Contact page on the KIRAKITAH website.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5;">
    <h1 style="font-size: 20px; margin-bottom: 8px;">${COMPETITION_NAME}</h1>
    <p>Enter this code to verify the email address on your application.</p>
    <p>Your verification code is:</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 0.12em;">${input.code}</p>
    <p>This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p><strong>Do not share this code with anyone.</strong></p>
    <p>Application reference: ${input.referenceId}</p>
    <p style="color: #555;">Verifying your email confirms contact ownership only. It does not confirm tournament participation.</p>
    <p style="color: #555;">If you did not submit this application, you can ignore this message.</p>
    <p style="color: #555;">Support: use the Contact page on the KIRAKITAH website.</p>
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
