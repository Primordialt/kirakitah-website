import { COMPETITION_NAME } from "@/config/competition";
import { REQUIRED_SOCIAL_ACCOUNTS } from "@/config/social";

/** Public-facing KG926 eligibility messaging — frontend clarity only. */
export const eligibilitySummaryItems = [
  {
    label: "AGE",
    value: "10+",
  },
  {
    label: "GUARDIAN",
    value: "Required for ages 10–17",
  },
  {
    label: "IDENTITY",
    value: "Manual review",
  },
  {
    label: "SOCIAL",
    value: REQUIRED_SOCIAL_ACCOUNTS.map((account) => account.label).join(" + "),
  },
  {
    label: "APPLICATION",
    value: "Manual review and approval",
  },
  {
    label: "PARTICIPATION",
    value: "Final participant selection is separate",
  },
] as const;

export const howToParticipateSteps = [
  {
    step: "01",
    title: "APPLY",
    description: `Submit your ${COMPETITION_NAME} application.`,
  },
  {
    step: "02",
    title: "MEET THE REQUIREMENTS",
    description:
      "You must be 10 or older and meet the tournament requirements. Applicants aged 10–17 must provide parent/guardian information.",
  },
  {
    step: "03",
    title: "FOLLOW KIRAKITAH",
    description: `Follow KIRAKITAH on ${REQUIRED_SOCIAL_ACCOUNTS.map((account) => account.label).join(", ")}.`,
  },
  {
    step: "04",
    title: "COMPLETE REVIEW",
    description:
      "Our team manually reviews your application, identity information and social follow status.",
  },
  {
    step: "05",
    title: "ELIGIBLE",
    description:
      "Once all required checks are satisfied, your application can become eligible for participation.",
  },
  {
    step: "06",
    title: "PARTICIPANT SELECTION",
    description:
      "Eligible applicants can then be selected into the tournament.",
  },
] as const;

export const socialRequirementCopy = {
  title: "REQUIRED BEFORE PARTICIPATION",
  lead: "You must follow KIRAKITAH on all three official social platforms:",
  platforms: REQUIRED_SOCIAL_ACCOUNTS,
  points: [
    "Your follows are manually verified by the KIRAKITAH team.",
    "Following the accounts is required for tournament participation.",
  ],
  applicationNote:
    "Submitting an application does not automatically qualify you for the tournament.",
} as const;

export const beforeYouApplyCopy = {
  title: "BEFORE YOU APPLY",
  lead: `${COMPETITION_NAME} participation requires:`,
  requirements: [
    "Age 10 or older",
    "Parent/guardian details for applicants aged 10–17",
    `Following KIRAKITAH on ${REQUIRED_SOCIAL_ACCOUNTS.map((account) => account.label).join(", ")}`,
    "Manual review of your application, identity and social-follow status",
  ],
  participationNote:
    "You can submit your application before social verification is completed, but you cannot participate in the tournament until all required social follows have been verified.",
  qualificationNote:
    "Submitting an application does not automatically qualify you for the tournament.",
} as const;

export const followKirakitahCopy = {
  legend: "FOLLOW KIRAKITAH",
  supporting:
    "Following KIRAKITAH on all three official platforms below is required before tournament participation.",
  reviewNote:
    "Your social follows will be manually verified by the KIRAKITAH team.",
  attestationLabel:
    "I confirm that I follow KIRAKITAH on all three official social platforms listed above.",
  attestationDescription:
    "Required before tournament participation. This attestation is not automatic verification.",
} as const;
