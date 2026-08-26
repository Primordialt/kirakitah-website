import { COMPETITION_NAME } from "@/config/competition";

export interface PasswordResetTemplateInput {
  resetUrl: string;
  expiresInHours: number;
}

export interface PasswordResetTemplate {
  subject: string;
  text: string;
  html: string;
}

/**
 * Transactional email for participant password reset.
 * Must never include NIN, passport, DOB, guardian data, or the raw reset token
 * outside the reset URL itself.
 */
export function buildPasswordResetTemplate(
  input: PasswordResetTemplateInput,
): PasswordResetTemplate {
  const expiresInHours = Math.max(1, Math.floor(input.expiresInHours));
  const subject = `${COMPETITION_NAME} — Reset Your Password`;

  const text = [
    "Hi,",
    "",
    `We received a request to reset the password for your ${COMPETITION_NAME} participant account.`,
    "",
    "Open this link to choose a new password:",
    input.resetUrl,
    "",
    `This link expires in ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"} and can only be used once.`,
    "",
    "If you did not request a password reset, you can ignore this email. Your password will stay the same.",
    "",
    "KIRAKITAH",
    "PLAY. COMPETE. CREATE.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5;">
    <p>Hi,</p>
    <p>We received a request to reset the password for your ${COMPETITION_NAME} participant account.</p>
    <p><a href="${input.resetUrl}">Reset your password</a></p>
    <p>This link expires in <strong>${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}</strong> and can only be used once.</p>
    <p>If you did not request a password reset, you can ignore this email. Your password will stay the same.</p>
    <p style="margin-top: 24px;"><strong>KIRAKITAH</strong><br/>PLAY. COMPETE. CREATE.</p>
  </body>
</html>
`.trim();

  return { subject, text, html };
}
