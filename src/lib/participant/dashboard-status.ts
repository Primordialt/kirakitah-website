export type ParticipantProfileStatus =
  | "incomplete"
  | "submitted_for_review"
  | "needs_correction"
  | "verified";

export function getProfileStatusLabel(status: ParticipantProfileStatus): string {
  switch (status) {
    case "incomplete":
      return "Incomplete";
    case "submitted_for_review":
      return "Submitted for review";
    case "needs_correction":
      return "Needs correction";
    case "verified":
      return "Verified";
    default:
      return "Unknown";
  }
}

export type DashboardCta = {
  headline: string;
  buttonLabel: string;
  href: string;
};

/**
 * Dashboard CTA mapping. Kept free of imports from profile-presentation
 * to avoid circular client bundles.
 */
export function getDashboardProfileCta(
  status: ParticipantProfileStatus,
  completionPercent = 0,
): DashboardCta {
  switch (status) {
    case "verified":
      return {
        headline: "VERIFIED",
        buttonLabel: "EXPLORE TOURNAMENTS",
        href: "/tournaments",
      };
    case "submitted_for_review":
      return {
        headline: "UNDER REVIEW",
        buttonLabel: "VIEW PROFILE",
        href: "/profile",
      };
    case "needs_correction":
      return {
        headline: "NEEDS CORRECTION",
        buttonLabel: "UPDATE PROFILE",
        href: "/profile",
      };
    case "incomplete":
    default:
      if (completionPercent >= 100) {
        return {
          headline: "READY TO SUBMIT",
          buttonLabel: "SUBMIT PROFILE",
          href: "/profile",
        };
      }
      return {
        headline: "INCOMPLETE",
        buttonLabel: "COMPLETE PROFILE",
        href: "/profile",
      };
  }
}
