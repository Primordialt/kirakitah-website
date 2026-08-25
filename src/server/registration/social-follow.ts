import { and, eq } from "drizzle-orm";
import {
  REQUIRED_SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/config/social";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  registrationSocialFollows,
} from "@/server/db/schema";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { KG926_ELIGIBILITY_RULES_VERSION } from "@/server/tournament/eligibility/eligibility-types";

export type SocialPlatformVerificationStatus = "pending" | "verified" | "rejected";
export type ApplicationSocialFollowStatus =
  | "pending_review"
  | "verified"
  | "rejected";

export interface SocialFollowRecord {
  id: string;
  platform: SocialPlatform;
  applicantHandle: string;
  verificationStatus: SocialPlatformVerificationStatus;
  verificationNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}

export function deriveApplicationSocialFollowStatus(
  platformStatuses: readonly SocialPlatformVerificationStatus[],
  requiredCount: number = REQUIRED_SOCIAL_PLATFORMS.length,
): ApplicationSocialFollowStatus {
  if (platformStatuses.length < requiredCount) {
    return "pending_review";
  }
  if (platformStatuses.some((status) => status === "rejected")) {
    return "rejected";
  }
  if (platformStatuses.every((status) => status === "verified")) {
    return "verified";
  }
  return "pending_review";
}

export async function insertPendingSocialFollows(input: {
  applicationId: string;
  handles: Record<string, string>;
}): Promise<void> {
  const db = getDb();
  const rows = REQUIRED_SOCIAL_PLATFORMS.map((platform) => {
    const handle = input.handles[platform]?.trim();
    if (!handle) {
      throw new Error(`Missing social handle for ${platform}`);
    }
    return {
      applicationId: input.applicationId,
      platform,
      applicantHandle: handle,
      verificationStatus: "pending" as const,
    };
  });

  await db.insert(registrationSocialFollows).values(rows);
}

export async function listSocialFollowsForApplication(
  applicationId: string,
): Promise<SocialFollowRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(registrationSocialFollows)
    .where(eq(registrationSocialFollows.applicationId, applicationId));

  return rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    applicantHandle: row.applicantHandle,
    verificationStatus: row.verificationStatus,
    verificationNotes: row.verificationNotes,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    updatedAt: row.updatedAt,
  }));
}

export async function submitSocialFollowReview(input: {
  referenceId: string;
  platform: SocialPlatform;
  decision: "approved" | "rejected";
  notes?: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{
  platformStatus: SocialPlatformVerificationStatus;
  socialFollowStatus: ApplicationSocialFollowStatus;
}> {
  const notes = (input.notes ?? "").trim();
  if (input.decision === "rejected" && notes.length < 8) {
    throw new Error("Review notes are required when rejecting social follow verification.");
  }

  const db = getDb();
  const [application] = await db
    .select({
      id: registrationApplications.id,
      referenceId: registrationApplications.referenceId,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, input.referenceId))
    .limit(1);

  if (!application) {
    throw new Error("Application not found");
  }

  const [row] = await db
    .select()
    .from(registrationSocialFollows)
    .where(
      and(
        eq(registrationSocialFollows.applicationId, application.id),
        eq(registrationSocialFollows.platform, input.platform),
      ),
    )
    .limit(1);

  if (!row) {
    throw new Error("Social follow record not found for this platform.");
  }

  const reviewedAt = new Date().toISOString();
  const platformStatus: SocialPlatformVerificationStatus =
    input.decision === "approved" ? "verified" : "rejected";

  await db
    .update(registrationSocialFollows)
    .set({
      verificationStatus: platformStatus,
      verificationNotes: notes || null,
      reviewedBy: input.actorId,
      reviewedAt,
      updatedAt: reviewedAt,
    })
    .where(eq(registrationSocialFollows.id, row.id));

  const allRows = await listSocialFollowsForApplication(application.id);
  const requiredStatuses = REQUIRED_SOCIAL_PLATFORMS.map((platform) => {
    const row = allRows.find((item) => item.platform === platform);
    return row?.verificationStatus ?? ("pending" as const);
  });
  const socialFollowStatus = deriveApplicationSocialFollowStatus(
    requiredStatuses,
    REQUIRED_SOCIAL_PLATFORMS.length,
  );

  await db
    .update(registrationApplications)
    .set({
      socialFollowStatus,
      updatedAt: reviewedAt,
    })
    .where(eq(registrationApplications.id, application.id));

  await recordAdminAuditEvent({
    eventType: "SOCIAL_FOLLOW_REVIEWED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    applicationId: application.id,
    applicationReference: application.referenceId,
    requestId: input.requestId,
    metadata: {
      platform: input.platform,
      action: input.decision,
      rulesVersion: KG926_ELIGIBILITY_RULES_VERSION,
    },
  });

  await recordAdminAuditEvent({
    eventType:
      input.decision === "approved"
        ? "SOCIAL_FOLLOW_APPROVED"
        : "SOCIAL_FOLLOW_REJECTED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    applicationId: application.id,
    applicationReference: application.referenceId,
    requestId: input.requestId,
    metadata: {
      platform: input.platform,
      action: input.decision,
      rulesVersion: KG926_ELIGIBILITY_RULES_VERSION,
    },
  });

  return { platformStatus, socialFollowStatus };
}
