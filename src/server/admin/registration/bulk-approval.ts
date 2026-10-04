import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { registrationApplications, registrationSocialFollows } from "@/server/db/schema";
import { REQUIRED_SOCIAL_PLATFORMS } from "@/config/social";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import {
  IdentityReviewConflictError,
} from "@/server/admin/registration/transitions";
import { submitIdentityReview } from "@/server/admin/registration/service";
import { submitSocialFollowReview } from "@/server/registration/social-follow";

export type BulkApprovalQueue = "identity_pending" | "social_pending";

export type BulkApprovalPreview = {
  queue: BulkApprovalQueue;
  eventId: string | null;
  targeted: number;
};

export type BulkApprovalResult = {
  queue: BulkApprovalQueue;
  eventId: string | null;
  targeted: number;
  approved: number;
  skipped: number;
  failed: number;
  failures: Array<{ referenceId: string; reason: string }>;
};

function queuePermission(queue: BulkApprovalQueue): "identity:review" | "social:review" {
  return queue === "identity_pending" ? "identity:review" : "social:review";
}

export function bulkApprovalPermissionForQueue(
  queue: BulkApprovalQueue,
): "identity:review" | "social:review" {
  return queuePermission(queue);
}

export async function previewBulkApproval(input: {
  queue: BulkApprovalQueue;
  eventId?: string | null;
}): Promise<BulkApprovalPreview> {
  const db = getDb();
  const eventId = input.eventId?.trim() || null;

  if (input.queue === "identity_pending") {
    const conditions = [
      eq(registrationApplications.identityVerificationStatus, "pending_review"),
    ];
    if (eventId) {
      conditions.push(eq(registrationApplications.eventId, eventId));
    }
    const rows = await db
      .select({ referenceId: registrationApplications.referenceId })
      .from(registrationApplications)
      .where(and(...conditions));
    return { queue: input.queue, eventId, targeted: rows.length };
  }

  const conditions = [eq(registrationApplications.socialFollowStatus, "pending_review")];
  if (eventId) {
    conditions.push(eq(registrationApplications.eventId, eventId));
  }
  const apps = await db
    .select({
      id: registrationApplications.id,
      referenceId: registrationApplications.referenceId,
    })
    .from(registrationApplications)
    .where(and(...conditions));

  let targeted = 0;
  for (const app of apps) {
    const platforms = await db
      .select({ verificationStatus: registrationSocialFollows.verificationStatus })
      .from(registrationSocialFollows)
      .where(
        and(
          eq(registrationSocialFollows.applicationId, app.id),
          eq(registrationSocialFollows.verificationStatus, "pending"),
        ),
      );
    targeted += platforms.length;
  }

  return { queue: input.queue, eventId, targeted };
}

export async function executeBulkApproval(input: {
  queue: BulkApprovalQueue;
  eventId?: string | null;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<BulkApprovalResult> {
  const db = getDb();
  const eventId = input.eventId?.trim() || null;
  const preview = await previewBulkApproval({
    queue: input.queue,
    eventId,
  });

  const result: BulkApprovalResult = {
    queue: input.queue,
    eventId,
    targeted: preview.targeted,
    approved: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  if (input.queue === "identity_pending") {
    const conditions = [
      eq(registrationApplications.identityVerificationStatus, "pending_review"),
    ];
    if (eventId) {
      conditions.push(eq(registrationApplications.eventId, eventId));
    }
    const rows = await db
      .select({ referenceId: registrationApplications.referenceId })
      .from(registrationApplications)
      .where(and(...conditions));

    for (const row of rows) {
      try {
        await submitIdentityReview({
          referenceId: row.referenceId,
          decision: "approved",
          actorId: input.actorId,
          actorRole: input.actorRole,
          requestId: input.requestId,
        });
        result.approved += 1;
      } catch (error) {
        if (error instanceof IdentityReviewConflictError) {
          result.skipped += 1;
          continue;
        }
        result.failed += 1;
        result.failures.push({
          referenceId: row.referenceId,
          reason: error instanceof Error ? error.message : "Unable to approve.",
        });
      }
    }
  } else {
    const conditions = [eq(registrationApplications.socialFollowStatus, "pending_review")];
    if (eventId) {
      conditions.push(eq(registrationApplications.eventId, eventId));
    }
    const apps = await db
      .select({
        id: registrationApplications.id,
        referenceId: registrationApplications.referenceId,
      })
      .from(registrationApplications)
      .where(and(...conditions));

    for (const app of apps) {
      const pendingPlatforms = await db
        .select({ platform: registrationSocialFollows.platform })
        .from(registrationSocialFollows)
        .where(
          and(
            eq(registrationSocialFollows.applicationId, app.id),
            eq(registrationSocialFollows.verificationStatus, "pending"),
          ),
        );

      for (const platformRow of pendingPlatforms) {
        if (!REQUIRED_SOCIAL_PLATFORMS.includes(platformRow.platform)) {
          result.skipped += 1;
          continue;
        }
        try {
          await submitSocialFollowReview({
            referenceId: app.referenceId,
            platform: platformRow.platform,
            decision: "approved",
            actorId: input.actorId,
            actorRole: input.actorRole,
            requestId: input.requestId,
          });
          result.approved += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to approve social follow.";
          if (message.toLowerCase().includes("not found")) {
            result.skipped += 1;
            continue;
          }
          result.failed += 1;
          result.failures.push({
            referenceId: app.referenceId,
            reason: `${platformRow.platform}: ${message}`,
          });
        }
      }
    }
  }

  await recordAdminAuditEvent({
    eventType: "REGISTRATION_BULK_APPROVAL",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      queue: result.queue,
      eventId: result.eventId,
      targeted: result.targeted,
      approved: result.approved,
      skipped: result.skipped,
      failed: result.failed,
    },
  });

  return result;
}
