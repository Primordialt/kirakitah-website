import type { ApplicationStatus } from "@/server/admin/registration-repository";

/**
 * Controlled application status transitions.
 * Identity approval does NOT drive these automatically.
 */
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  received: ["under_review", "withdrawn"],
  under_review: ["verified", "rejected", "withdrawn"],
  verified: [],
  rejected: [],
  withdrawn: [],
};

export function canTransitionApplicationStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertApplicationStatusTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): void {
  if (!canTransitionApplicationStatus(from, to)) {
    throw new ApplicationStatusTransitionError(
      `Transition from ${from} to ${to} is not allowed.`,
    );
  }
}

export class ApplicationStatusTransitionError extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "ApplicationStatusTransitionError";
  }
}

/** Identity review: pending_review → verified | rejected only */
export function canTransitionIdentityReview(
  current: string,
  decision: "approved" | "rejected",
): boolean {
  if (current !== "pending_review") return false;
  return decision === "approved" || decision === "rejected";
}

export class IdentityReviewConflictError extends Error {
  readonly status = 409;

  constructor(message = "Identity review is no longer pending.") {
    super(message);
    this.name = "IdentityReviewConflictError";
  }
}
