import { COMPETITION_NAME } from "@/config/competition";

export type LifecycleEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

function wrapHtml(title: string, paragraphs: string[], cta?: { href: string; label: string }) {
  const body = paragraphs.map((p) => `<p>${p}</p>`).join("\n    ");
  const button = cta
    ? `<p style="margin: 24px 0;"><a href="${cta.href}" style="display:inline-block;background:#40217c;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">${cta.label}</a></p>`
    : "";
  return `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5; max-width: 560px;">
    <p style="letter-spacing: 0.12em; font-size: 12px; font-weight: 700; color: #40217c;">KIRAKITAH</p>
    <h1 style="font-size: 22px; margin: 8px 0 16px;">${title}</h1>
    ${body}
    ${button}
    <p style="margin-top: 28px;"><strong>KIRAKITAH</strong><br/>PLAY. COMPETE. CREATE.</p>
  </body>
</html>
`.trim();
}

export function buildApplicationReceivedTemplate(input: {
  referenceId: string;
  actionUrl: string;
}): LifecycleEmailTemplate {
  const title = "Application received";
  const subject = `${COMPETITION_NAME} — Application received`;
  const paragraphs = [
    `Your ${COMPETITION_NAME} application has been received.`,
    `Application reference: ${input.referenceId}`,
    "Your application will go through the required review and eligibility process.",
    "Application submission does not guarantee participation, eligibility, or selection.",
  ];
  return {
    subject,
    text: [
      "KIRAKITAH",
      "",
      title,
      "",
      ...paragraphs,
      "",
      `View application: ${input.actionUrl}`,
      "",
      "KIRAKITAH",
      "PLAY. COMPETE. CREATE.",
    ].join("\n"),
    html: wrapHtml(title, paragraphs, {
      href: input.actionUrl,
      label: "View application",
    }),
  };
}

export function buildProfileVerifiedTemplate(input: {
  actionUrl: string;
}): LifecycleEmailTemplate {
  const title = "Profile verified";
  const subject = `${COMPETITION_NAME} — Profile verified`;
  const paragraphs = [
    "Your participant profile has been verified.",
    "You can now continue to tournament applications where you are eligible to apply.",
    "Profile verification does not mean you have been selected for a tournament.",
  ];
  return {
    subject,
    text: [
      "KIRAKITAH",
      "",
      title,
      "",
      ...paragraphs,
      "",
      `Open tournaments: ${input.actionUrl}`,
      "",
      "KIRAKITAH",
      "PLAY. COMPETE. CREATE.",
    ].join("\n"),
    html: wrapHtml(title, paragraphs, {
      href: input.actionUrl,
      label: "Explore tournaments",
    }),
  };
}

export function buildProfileReopenedTemplate(input: {
  actionUrl: string;
}): LifecycleEmailTemplate {
  const title = "Profile verification updated";
  const subject = `${COMPETITION_NAME} — Profile verification updated`;
  const paragraphs = [
    "Your profile verification has been reopened for review.",
    "Please check your profile information and make any required corrections.",
    "You will need to submit your profile again after updating it.",
  ];
  return {
    subject,
    text: [
      "KIRAKITAH",
      "",
      title,
      "",
      ...paragraphs,
      "",
      `Review profile: ${input.actionUrl}`,
      "",
      "KIRAKITAH",
      "PLAY. COMPETE. CREATE.",
    ].join("\n"),
    html: wrapHtml(title, paragraphs, {
      href: input.actionUrl,
      label: "Review profile",
    }),
  };
}

export function buildProfileCorrectionTemplate(input: {
  reason: string;
  actionUrl: string;
}): LifecycleEmailTemplate {
  const title = "Action required — update your profile";
  const subject = `${COMPETITION_NAME} — Profile update required`;
  const paragraphs = [
    "Your participant profile needs an update before it can be approved.",
    input.reason,
    "Review and update your profile, then submit it again for verification.",
  ];
  return {
    subject,
    text: [
      "KIRAKITAH",
      "",
      title,
      "",
      ...paragraphs,
      "",
      `Review profile: ${input.actionUrl}`,
      "",
      "KIRAKITAH",
      "PLAY. COMPETE. CREATE.",
    ].join("\n"),
    html: wrapHtml(title, paragraphs, {
      href: input.actionUrl,
      label: "Review profile",
    }),
  };
}

export function buildSelectionTemplate(input: {
  publicCode: string | null;
  actionUrl: string;
}): LifecycleEmailTemplate {
  const title = "You have been selected";
  const subject = `${COMPETITION_NAME} — You have been selected`;
  const paragraphs = [
    `You have been selected to participate in ${COMPETITION_NAME}.`,
    input.publicCode
      ? `Your participant public code is ${input.publicCode}.`
      : "Your participant record is now active.",
    "Qualification is the next stage. Selection does not mean the tournament is complete.",
  ];
  return {
    subject,
    text: [
      "KIRAKITAH",
      "",
      title,
      "",
      ...paragraphs,
      "",
      `View tournament: ${input.actionUrl}`,
      "",
      "KIRAKITAH",
      "PLAY. COMPETE. CREATE.",
    ].join("\n"),
    html: wrapHtml(title, paragraphs, {
      href: input.actionUrl,
      label: "View tournament",
    }),
  };
}
