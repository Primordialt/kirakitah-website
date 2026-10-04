import { TOURNAMENT_EVENT_ID } from "@/config/competition";

export type ApplicationStatCardKey =
  | "totalApplications"
  | "received"
  | "pendingIdentityReviews"
  | "pendingSocialReviews"
  | "underReview"
  | "approved"
  | "rejected"
  | "pendingContactVerification";

export function applicationStatCardHref(
  key: ApplicationStatCardKey,
  eventId: string = TOURNAMENT_EVENT_ID,
): string {
  const base = `/admin/tournaments/${eventId}/applications`;
  switch (key) {
    case "totalApplications":
      return base;
    case "received":
      return `${base}?status=received`;
    case "pendingIdentityReviews":
      return `${base}?identityStatus=pending_review`;
    case "pendingSocialReviews":
      return `${base}?socialFollowStatus=pending_review`;
    case "underReview":
      return `${base}?status=under_review`;
    case "approved":
      return `${base}?status=verified`;
    case "rejected":
      return `${base}?status=rejected`;
    case "pendingContactVerification":
      return `${base}?emailVerificationStatus=pending`;
    default:
      return base;
  }
}

export const DASHBOARD_STAT_CARDS: Array<{
  key: ApplicationStatCardKey;
  label: string;
  hint?: string;
}> = [
  { key: "totalApplications", label: "Total applications", hint: "All applications" },
  { key: "received", label: "Received", hint: "Newly received" },
  {
    key: "pendingIdentityReviews",
    label: "Pending identity reviews",
    hint: "Identity queue",
  },
  {
    key: "pendingSocialReviews",
    label: "Pending social reviews",
    hint: "Social follow queue",
  },
  { key: "underReview", label: "Under review", hint: "Application under review" },
  { key: "approved", label: "Verified applications", hint: "Verified status" },
  { key: "rejected", label: "Rejected applications", hint: "Rejected status" },
];

export const APPLICATIONS_QUEUE_STAT_CARDS: Array<{
  key: ApplicationStatCardKey;
  label: string;
  filterKey: "totalApplications" | "received" | "underReview" | "approved" | "rejected";
}> = [
  { key: "totalApplications", label: "Total", filterKey: "totalApplications" },
  { key: "received", label: "Received", filterKey: "received" },
  { key: "underReview", label: "Under review", filterKey: "underReview" },
  { key: "approved", label: "Verified", filterKey: "approved" },
  { key: "rejected", label: "Rejected", filterKey: "rejected" },
];

export function applicationsQueueStatHref(
  filterKey: ApplicationStatCardKey,
  basePath: string,
  eventId?: string,
): string {
  const query = new URLSearchParams();
  if (eventId) query.set("eventId", eventId);
  switch (filterKey) {
    case "received":
      query.set("status", "received");
      break;
    case "underReview":
      query.set("status", "under_review");
      break;
    case "approved":
      query.set("status", "verified");
      break;
    case "rejected":
      query.set("status", "rejected");
      break;
    default:
      break;
  }
  const q = query.toString();
  return q ? `${basePath}?${q}` : basePath;
}
