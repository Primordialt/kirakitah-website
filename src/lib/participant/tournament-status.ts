/** Participant-safe presentation labels — do not rename backend statuses. */

export type ApplicationStatus =
  | "received"
  | "under_review"
  | "verified"
  | "rejected"
  | "withdrawn";

export function getApplicationStatusPresentation(status: string): {
  label: string;
  description: string;
} {
  switch (status) {
    case "received":
      return {
        label: "APPLICATION RECEIVED",
        description:
          "Your application has been received and is being reviewed.",
      };
    case "under_review":
      return {
        label: "UNDER REVIEW",
        description: "Your application is currently under review.",
      };
    case "verified":
      return {
        label: "APPLICATION APPROVED",
        description:
          "Your application has been approved. Selection and eligibility are separate steps.",
      };
    case "rejected":
      return {
        label: "APPLICATION NOT APPROVED",
        description:
          "Your application was not approved for this tournament.",
      };
    case "withdrawn":
      return {
        label: "WITHDRAWN",
        description: "This application has been withdrawn.",
      };
    default:
      return {
        label: status.toUpperCase().replace(/_/g, " "),
        description: "Application status update.",
      };
  }
}

export function getIdentityStatusPresentation(status: string): {
  label: string;
  tone: "pending" | "verified" | "action";
} {
  switch (status) {
    case "verified":
      return { label: "Verified", tone: "verified" };
    case "rejected":
    case "mismatch":
    case "not_found":
      return { label: "Needs correction", tone: "action" };
    case "manual_review":
    case "pending_review":
    default:
      return { label: "Pending review", tone: "pending" };
  }
}

export function getSocialAggregatePresentation(status: string): {
  label: string;
  tone: "pending" | "verified" | "action";
} {
  switch (status) {
    case "verified":
      return { label: "Verified", tone: "verified" };
    case "rejected":
      return { label: "Requires action", tone: "action" };
    case "pending_review":
    default:
      return { label: "Pending review", tone: "pending" };
  }
}

export function getSocialPlatformPresentation(status: string): {
  label: string;
  tone: "pending" | "verified" | "action";
} {
  switch (status) {
    case "verified":
      return { label: "Verified", tone: "verified" };
    case "rejected":
      return { label: "Requires action", tone: "action" };
    case "pending":
    default:
      return { label: "Pending review", tone: "pending" };
  }
}

export function getEligibilityPresentation(state: "ELIGIBLE" | "NOT_ELIGIBLE"): {
  label: string;
  description: string;
} {
  if (state === "ELIGIBLE") {
    return {
      label: "ELIGIBLE",
      description:
        "You meet the current eligibility requirements. Selection is a separate step.",
    };
  }
  return {
    label: "ELIGIBILITY PENDING",
    description:
      "Some eligibility requirements are not yet met. This does not mean you have been selected.",
  };
}

export function getSelectionPresentation(status: string): {
  label: string;
  description: string;
} {
  switch (status) {
    case "selected":
      return {
        label: "SELECTED",
        description:
          "You have been selected for the tournament. Qualification is a separate phase.",
      };
    case "withdrawn":
      return {
        label: "WITHDRAWN",
        description: "Your tournament participation has been withdrawn.",
      };
    case "disqualified":
      return {
        label: "DISQUALIFIED",
        description: "Your tournament participation has been disqualified.",
      };
    default:
      return {
        label: "NOT SELECTED",
        description:
          "You have not been selected for this tournament at this time.",
      };
  }
}

export function getNotificationPresentation(eventType: string): {
  title: string;
  description: string;
} {
  switch (eventType) {
    case "MATCH_SCHEDULED":
      return {
        title: "Match scheduled",
        description: "A match has been scheduled for you.",
      };
    case "MATCH_RESCHEDULED":
      return {
        title: "Match rescheduled",
        description: "One of your matches has a new schedule.",
      };
    case "MATCH_REMINDER":
      return {
        title: "Upcoming match",
        description: "You have an upcoming match.",
      };
    case "MATCH_CANCELLED":
      return {
        title: "Match cancelled",
        description: "A scheduled match was cancelled.",
      };
    default:
      return {
        title: eventType.replace(/_/g, " "),
        description: "Tournament update.",
      };
  }
}

export const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};
