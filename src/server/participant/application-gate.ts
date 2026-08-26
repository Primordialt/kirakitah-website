import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  participantAccounts,
  participantProfiles,
  registrationApplications,
} from "@/server/db/schema";
import type { ApiErrorCode } from "@/server/errors";

export class ApplicationGateError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApplicationGateError";
    this.code = code;
    this.status =
      status ??
      (code === "UNAUTHORIZED"
        ? 401
        : code === "FORBIDDEN"
          ? 403
          : code === "DUPLICATE_APPLICATION" || code === "CONFLICT"
            ? 409
            : code === "NOT_FOUND"
              ? 404
              : 400);
  }
}

const ACTIVE_APPLICATION_STATUSES = [
  "received",
  "under_review",
  "verified",
] as const;

export type ApplicationGateResult = {
  accountId: string;
  profileId: string;
  email: string;
};

export type ProfileApplicationBlock = {
  code:
    | "PROFILE_INCOMPLETE"
    | "PROFILE_REQUIRES_CORRECTION"
    | "PROFILE_NOT_VERIFIED";
  message: string;
};

/**
 * Pure gate check for profile status (no DB). Returns null when verified.
 */
export function getProfileApplicationBlock(
  status: string | null | undefined,
  correctionReason?: string | null,
): ProfileApplicationBlock | null {
  if (!status) {
    return {
      code: "PROFILE_INCOMPLETE",
      message: "Complete your participant profile before applying.",
    };
  }

  if (status === "incomplete") {
    return {
      code: "PROFILE_INCOMPLETE",
      message:
        "Complete and submit your profile for review before applying.",
    };
  }

  if (status === "needs_correction") {
    return {
      code: "PROFILE_REQUIRES_CORRECTION",
      message:
        correctionReason?.trim() ||
        "Your profile needs corrections before you can apply.",
    };
  }

  if (status === "submitted_for_review") {
    return {
      code: "PROFILE_NOT_VERIFIED",
      message:
        "Your profile is still under review. You can apply once it is verified.",
    };
  }

  if (status !== "verified") {
    return {
      code: "PROFILE_NOT_VERIFIED",
      message: "Your profile must be verified before you can apply.",
    };
  }

  return null;
}

/**
 * Assert a participant may apply to a tournament event.
 * Returns account/profile context on success.
 */
export async function assertCanApplyToTournament(
  accountId: string,
  eventId: string,
): Promise<ApplicationGateResult> {
  if (!accountId) {
    throw new ApplicationGateError(
      "UNAUTHORIZED",
      "Sign in to apply to this tournament.",
    );
  }

  const db = getDb();
  const [account] = await db
    .select({
      id: participantAccounts.id,
      email: participantAccounts.email,
      active: participantAccounts.active,
      emailVerifiedAt: participantAccounts.emailVerifiedAt,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, accountId))
    .limit(1);

  if (!account || !account.active) {
    throw new ApplicationGateError(
      "UNAUTHORIZED",
      "Sign in to apply to this tournament.",
    );
  }

  if (!account.emailVerifiedAt) {
    throw new ApplicationGateError(
      "EMAIL_VERIFICATION_REQUIRED",
      "Verify your email before applying.",
    );
  }

  const [profile] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.accountId, accountId))
    .limit(1);

  if (!profile) {
    throw new ApplicationGateError(
      "PROFILE_INCOMPLETE",
      "Complete your participant profile before applying.",
    );
  }

  const block = getProfileApplicationBlock(
    profile.status,
    profile.correctionReason,
  );
  if (block) {
    throw new ApplicationGateError(block.code, block.message);
  }

  const [duplicateByAccount] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        eq(registrationApplications.participantAccountId, accountId),
        inArray(registrationApplications.status, [
          ...ACTIVE_APPLICATION_STATUSES,
        ]),
      ),
    )
    .limit(1);

  if (duplicateByAccount) {
    throw new ApplicationGateError(
      "DUPLICATE_APPLICATION",
      "You already have an active application for this tournament.",
    );
  }

  const [duplicateByEmail] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        inArray(registrationApplications.status, [
          ...ACTIVE_APPLICATION_STATUSES,
        ]),
        sql`lower(${registrationApplications.email}) = ${account.email.toLowerCase()}`,
      ),
    )
    .limit(1);

  if (duplicateByEmail) {
    throw new ApplicationGateError(
      "DUPLICATE_APPLICATION",
      "An active application already exists for this email address.",
    );
  }

  return {
    accountId: account.id,
    profileId: profile.id,
    email: account.email,
  };
}
