import { COMPETITION_NAME } from "@/config/competition";
import {
  KIRAKITAH_YOUTUBE_CHANNEL_URL,
  REQUIRED_FOLLOW_ACCOUNTS,
  REQUIRED_SOCIAL_ACCOUNTS,
} from "@/config/social";

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
    description: `Follow KIRAKITAH on ${REQUIRED_FOLLOW_ACCOUNTS.map((account) => account.label).join(", ")} and subscribe on YouTube.`,
  },
  {
    step: "04",
    title: "COMPLETE REVIEW",
    description:
      "Our team reviews your application, identity information and social requirements.",
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
  lead: "You must follow KIRAKITAH on all official social platforms and subscribe on YouTube:",
  platforms: REQUIRED_SOCIAL_ACCOUNTS,
  points: [
    "Your follows and YouTube subscription are manually verified by the KIRAKITAH team.",
    "Completing these requirements is required for tournament participation.",
    "Self-reported attestation is not automatic verification.",
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
    `Following KIRAKITAH on ${REQUIRED_FOLLOW_ACCOUNTS.map((account) => account.label).join(", ")}`,
    "Subscribing to the official KIRAKITAH YouTube channel",
    "Manual review of your application, identity and social requirements",
  ],
  participationNote:
    "You can submit your application before social verification is completed, but you cannot participate in the tournament until all required social requirements have been verified.",
  qualificationNote:
    "Submitting an application does not automatically qualify you for the tournament.",
} as const;

export const followKirakitahCopy = {
  legend: "FOLLOW KIRAKITAH",
  supporting:
    "Following KIRAKITAH on the official platforms below and subscribing on YouTube are required before tournament participation.",
  reviewNote:
    "Your social follows and YouTube subscription will be manually verified by the KIRAKITAH team.",
  attestationLabel:
    "I confirm that I follow KIRAKITAH on X, Instagram and TikTok as listed above.",
  attestationDescription:
    "Required before tournament participation. This attestation is not automatic verification.",
} as const;

export const youtubeSubscriptionCopy = {
  title: "YOUTUBE SUBSCRIPTION",
  lead: "Subscribe to the official KIRAKITAH YouTube channel to complete your KG926 eligibility requirements.",
  channelLabel: "KIRAKITAH",
  channelHandle: "@Kirakitah926",
  subscribeCta: "Subscribe to KIRAKITAH on YouTube",
  attestationLabel: "I have subscribed to KIRAKITAH on YouTube",
  attestationDescription:
    "This creates a review item for our team. It is not automatic verification.",
  pendingReviewNote:
    "Your YouTube subscription is pending manual review. We will verify it before marking this requirement complete.",
  channelFieldDescription:
    "Optional — helps our team verify your subscription during manual review.",
} as const;

export const KIRAKITAH_YOUTUBE_URL = KIRAKITAH_YOUTUBE_CHANNEL_URL;
