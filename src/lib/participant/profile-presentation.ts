import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import type { ParticipantProfileStatus } from "@/lib/participant/dashboard-status";

export type ProfilePresentation = {
  /** Short verification label for status chips (text, not colour-only). */
  verificationLabel: string;
  /** Participant-facing explanation. */
  description: string;
  /** Next action heading. */
  nextActionLabel: string;
  buttonLabel: string;
  href: string;
};

/**
 * Maps authoritative backend profile statuses to participant-facing copy.
 * Does not invent statuses — only presents existing ones.
 */
export function getProfilePresentation(
  status: ParticipantProfileStatus,
  completionPercent: number,
): ProfilePresentation {
  switch (status) {
    case "verified":
      return {
        verificationLabel: "VERIFIED",
        description:
          "Your profile has been verified. You can now apply for eligible tournaments. Verification does not mean you are selected or qualified.",
        nextActionLabel: "Explore tournaments",
        buttonLabel: "EXPLORE TOURNAMENTS",
        href: "/tournaments",
      };
    case "submitted_for_review":
      return {
        verificationLabel: "UNDER REVIEW",
        description:
          "Your profile has been submitted and is currently being reviewed. You cannot apply for tournaments until an administrator verifies your profile.",
        nextActionLabel: "View profile",
        buttonLabel: "VIEW PROFILE",
        href: "/profile",
      };
    case "needs_correction":
      return {
        verificationLabel: "NEEDS CORRECTION",
        description:
          "Your profile needs an update before it can be verified. Update the required information and resubmit for review.",
        nextActionLabel: "Update profile",
        buttonLabel: "UPDATE PROFILE",
        href: "/profile",
      };
    case "incomplete":
    default:
      if (completionPercent >= 100) {
        return {
          verificationLabel: "READY TO SUBMIT",
          description:
            "Your profile is complete and ready to be submitted for administrator verification. Saving alone does not start review.",
          nextActionLabel: "Submit for verification",
          buttonLabel: "SUBMIT PROFILE",
          href: "/profile",
        };
      }
      return {
        verificationLabel: "INCOMPLETE",
        description:
          "Complete your profile before you can apply for tournaments. Account login is separate from profile verification.",
        nextActionLabel: "Complete profile",
        buttonLabel: "COMPLETE PROFILE",
        href: "/profile",
      };
  }
}

export type TournamentApplyPresentation = {
  buttonLabel: string;
  href: string;
  description: string;
};

/** Context-aware Apply CTA from profile status (server gate remains authoritative). */
export function getTournamentApplyPresentation(
  status: ParticipantProfileStatus,
  completionPercent: number,
  hasApplication: boolean,
  tournamentId: string = TOURNAMENT_EVENT_ID,
): TournamentApplyPresentation {
  if (hasApplication) {
    return {
      buttonLabel: "VIEW DETAILS",
      href: `/tournaments/${tournamentId}`,
      description: "You already have an application on file for this tournament.",
    };
  }

  switch (status) {
    case "verified":
      return {
        buttonLabel: "APPLY FOR TOURNAMENT",
        href: `/tournaments/${tournamentId}/apply`,
        description:
          "Your profile is verified. You can continue to the tournament application. Eligibility and selection are separate steps.",
      };
    case "submitted_for_review":
      return {
        buttonLabel: "PROFILE UNDER REVIEW",
        href: "/profile",
        description:
          "Your profile is awaiting verification. You can apply once an administrator has verified your profile.",
      };
    case "needs_correction":
      return {
        buttonLabel: "UPDATE PROFILE",
        href: "/profile",
        description:
          "Update your profile and resubmit it for verification before applying.",
      };
    case "incomplete":
    default:
      if (completionPercent >= 100) {
        return {
          buttonLabel: "SUBMIT PROFILE",
          href: "/profile",
          description:
            "Submit your completed profile for verification before applying.",
        };
      }
      return {
        buttonLabel: "COMPLETE PROFILE",
        href: "/profile",
        description: "Complete your profile before applying for a tournament.",
      };
  }
}

/** Map application-gate error codes to safe CTA labels. */
export function getApplyGateAction(
  code: string | null | undefined,
): { buttonLabel: string; href: string } {
  switch (code) {
    case "PROFILE_REQUIRES_CORRECTION":
      return { buttonLabel: "UPDATE PROFILE", href: "/profile" };
    case "PROFILE_NOT_VERIFIED":
      return { buttonLabel: "VIEW PROFILE", href: "/profile" };
    case "PROFILE_INCOMPLETE":
    case "EMAIL_VERIFICATION_REQUIRED":
      return { buttonLabel: "COMPLETE PROFILE", href: "/profile" };
    default:
      return { buttonLabel: "GO TO PROFILE", href: "/profile" };
  }
}

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  dateOfBirth: "Date of birth",
  country: "Country",
  city: "City",
  phone: "Phone",
  identificationType: "Identification type",
  identificationNumber: "Identification number",
  gamerTag: "eFootball username",
  playerPhoto: "Player photo",
  guardian: "Parent / guardian details",
};

export function formatMissingFieldLabel(field: string): string {
  return PROFILE_FIELD_LABELS[field] ?? field;
}

export type ProfileTimelineStep = {
  id: string;
  label: string;
  detail: string | null;
  current: boolean;
};

/**
 * Participant-safe timeline from existing profile timestamps/status only.
 * Omits invented history when timestamps are absent.
 */
export function getProfileTimeline(input: {
  status: ParticipantProfileStatus;
  submittedAt: string | null;
  verifiedAt: string | null;
  correctionReason: string | null;
}): ProfileTimelineStep[] {
  const steps: ProfileTimelineStep[] = [];

  steps.push({
    id: "draft",
    label: "Profile in progress",
    detail: null,
    current: input.status === "incomplete",
  });

  if (input.submittedAt || input.status !== "incomplete") {
    steps.push({
      id: "submitted",
      label: "Submitted for review",
      detail: input.submittedAt
        ? new Date(input.submittedAt).toLocaleString()
        : null,
      current: input.status === "submitted_for_review",
    });
  }

  if (input.status === "needs_correction") {
    steps.push({
      id: "correction",
      label: "Correction requested",
      detail: input.correctionReason,
      current: true,
    });
  }

  if (input.verifiedAt || input.status === "verified") {
    steps.push({
      id: "verified",
      label: "Profile verified",
      detail: input.verifiedAt
        ? new Date(input.verifiedAt).toLocaleString()
        : null,
      current: input.status === "verified",
    });
  }

  return steps;
}
