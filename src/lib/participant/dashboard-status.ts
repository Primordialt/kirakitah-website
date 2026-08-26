import { TOURNAMENT_EVENT_ID } from "@/config/competition";

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

export function getDashboardProfileCta(
  status: ParticipantProfileStatus,
): DashboardCta {
  switch (status) {
    case "submitted_for_review":
      return {
        headline: "PROFILE VERIFICATION PENDING",
        buttonLabel: "VIEW PROFILE",
        href: "/profile",
      };
    case "needs_correction":
      return {
        headline: "PROFILE UPDATE REQUIRED",
        buttonLabel: "UPDATE PROFILE",
        href: "/profile",
      };
    case "verified":
      return {
        headline: "YOU'RE READY TO APPLY",
        buttonLabel: "APPLY FOR TOURNAMENT",
        href: `/tournaments/${TOURNAMENT_EVENT_ID}/apply`,
      };
    case "incomplete":
    default:
      return {
        headline: "COMPLETE YOUR PROFILE",
        buttonLabel: "COMPLETE PROFILE",
        href: "/profile",
      };
  }
}
