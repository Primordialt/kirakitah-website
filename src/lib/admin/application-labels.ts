/** Admin-facing labels for application operations — presentation only. */

export function formatApplicationStatusLabel(status: string): string {
  switch (status) {
    case "received":
      return "Received";
    case "under_review":
      return "Under review";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    default:
      return status.replace(/_/g, " ");
  }
}

export function formatIdentityStatusLabel(status: string): string {
  switch (status) {
    case "pending_review":
      return "Pending";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "manual_review":
      return "Manual review";
    default:
      return status.replace(/_/g, " ");
  }
}

export function formatSocialStatusLabel(status: string): string {
  switch (status) {
    case "pending_review":
      return "Pending";
    case "verified":
      return "Verified";
    case "rejected":
      return "Requires action";
    default:
      return status.replace(/_/g, " ");
  }
}

export function formatAuditEventLabel(eventType: string): string {
  switch (eventType) {
    case "APPLICATION_STATUS_CHANGED":
      return "Application status changed";
    case "IDENTITY_REVIEW_APPROVED":
      return "Identity verified";
    case "IDENTITY_REVIEW_REJECTED":
      return "Identity rejected";
    case "SOCIAL_FOLLOW_REVIEWED":
      return "Social follow reviewed";
    case "SOCIAL_FOLLOW_APPROVED":
      return "Social follow approved";
    case "SOCIAL_FOLLOW_REJECTED":
      return "Social follow rejected";
    default:
      return eventType.replace(/_/g, " ");
  }
}

export const APPLICATION_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "received", label: "Received" },
  { value: "under_review", label: "Under review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;
