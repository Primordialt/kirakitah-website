import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { get } from "@vercel/blob";
import { getDb } from "@/server/db";
import {
  adminAuditEvents,
  registrationApplications,
  registrationGuardians,
} from "@/server/db/schema";
import { listSocialFollowsForApplication } from "@/server/registration/social-follow";
import { REQUIRED_SOCIAL_PLATFORMS } from "@/config/social";
import { serverEnv } from "@/server/env";
import { decryptSensitiveValue } from "@/server/registration/pii";
import { recordAuditEvent } from "@/server/audit/events";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import {
  roleHasPermission,
} from "@/server/admin/authorization/permissions";
import {
  type AdminApplicationDetail,
  type AdminApplicationListItem,
  type AdminAuditEvent,
  type AdminDashboardStats,
  type AdminSensitiveIdentity,
  maskIdentificationNumber,
  sanitizeReviewNotes,
} from "@/server/admin/registration/projections";
import {
  ApplicationStatusTransitionError,
  IdentityReviewConflictError,
  assertApplicationStatusTransition,
  canTransitionIdentityReview,
} from "@/server/admin/registration/transitions";
import type { ApplicationStatus } from "@/server/admin/registration-repository";

const ALLOWED_PAGE_SIZES = new Set([10, 25, 50]);

export interface ListApplicationsQuery {
  page?: number;
  pageSize?: number;
  status?: ApplicationStatus;
  identityStatus?: string;
  socialFollowStatus?: string;
  emailVerificationStatus?: string;
  phoneVerificationStatus?: string;
  eventId?: string;
  referenceId?: string;
  submittedFrom?: string;
  submittedTo?: string;
  /** Requires elevated permission — checked by caller */
  search?: string;
  allowPiiSearch?: boolean;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const db = getDb();

  const [totals] = await db
    .select({
      totalApplications: count(),
      received: sql<number>`count(*) filter (where ${registrationApplications.status} = 'received')`,
      pendingIdentityReviews: sql<number>`count(*) filter (where ${registrationApplications.identityVerificationStatus} = 'pending_review')`,
      pendingSocialReviews: sql<number>`count(*) filter (where ${registrationApplications.socialFollowStatus} = 'pending_review')`,
      pendingContactVerification: sql<number>`count(*) filter (where ${registrationApplications.emailVerificationStatus} = 'pending' or ${registrationApplications.phoneVerificationStatus} = 'pending')`,
      underReview: sql<number>`count(*) filter (where ${registrationApplications.status} = 'under_review')`,
      approved: sql<number>`count(*) filter (where ${registrationApplications.status} = 'verified')`,
      rejected: sql<number>`count(*) filter (where ${registrationApplications.status} = 'rejected')`,
    })
    .from(registrationApplications);

  return {
    totalApplications: Number(totals?.totalApplications ?? 0),
    received: Number(totals?.received ?? 0),
    pendingIdentityReviews: Number(totals?.pendingIdentityReviews ?? 0),
    pendingSocialReviews: Number(totals?.pendingSocialReviews ?? 0),
    pendingContactVerification: Number(totals?.pendingContactVerification ?? 0),
    underReview: Number(totals?.underReview ?? 0),
    approved: Number(totals?.approved ?? 0),
    rejected: Number(totals?.rejected ?? 0),
  };
}

export async function listAdminApplications(query: ListApplicationsQuery): Promise<{
  items: AdminApplicationListItem[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const db = getDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = ALLOWED_PAGE_SIZES.has(query.pageSize ?? 25)
    ? (query.pageSize ?? 25)
    : 25;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (query.status) {
    conditions.push(eq(registrationApplications.status, query.status));
  }
  if (query.identityStatus) {
    conditions.push(
      sql`${registrationApplications.identityVerificationStatus}::text = ${query.identityStatus}`,
    );
  }
  if (query.socialFollowStatus) {
    conditions.push(
      sql`${registrationApplications.socialFollowStatus}::text = ${query.socialFollowStatus}`,
    );
  }
  if (query.emailVerificationStatus) {
    conditions.push(
      sql`${registrationApplications.emailVerificationStatus}::text = ${query.emailVerificationStatus}`,
    );
  }
  if (query.phoneVerificationStatus) {
    conditions.push(
      sql`${registrationApplications.phoneVerificationStatus}::text = ${query.phoneVerificationStatus}`,
    );
  }
  if (query.eventId) {
    conditions.push(eq(registrationApplications.eventId, query.eventId));
  }
  if (query.referenceId) {
    conditions.push(
      eq(registrationApplications.referenceId, query.referenceId.trim().toUpperCase()),
    );
  }
  if (query.submittedFrom) {
    conditions.push(gte(registrationApplications.createdAt, query.submittedFrom));
  }
  if (query.submittedTo) {
    conditions.push(lte(registrationApplications.createdAt, query.submittedTo));
  }
  if (query.search && query.allowPiiSearch) {
    const term = `%${query.search.trim()}%`;
    conditions.push(
      or(
        ilike(registrationApplications.fullName, term),
        ilike(registrationApplications.email, term),
        ilike(registrationApplications.phone, term),
        ilike(registrationApplications.referenceId, term),
        ilike(registrationApplications.gamerTag, term),
      ),
    );
  } else if (query.search) {
    const term = `%${query.search.trim()}%`;
    conditions.push(
      or(
        ilike(registrationApplications.referenceId, term),
        ilike(registrationApplications.gamerTag, term),
      ),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(registrationApplications)
    .where(where);

  const rows = await db
    .select({
      referenceId: registrationApplications.referenceId,
      fullName: registrationApplications.fullName,
      gamerTag: registrationApplications.gamerTag,
      createdAt: registrationApplications.createdAt,
      eventId: registrationApplications.eventId,
      status: registrationApplications.status,
      identityVerificationStatus:
        registrationApplications.identityVerificationStatus,
      socialFollowStatus: registrationApplications.socialFollowStatus,
      emailVerificationStatus: registrationApplications.emailVerificationStatus,
      phoneVerificationStatus: registrationApplications.phoneVerificationStatus,
    })
    .from(registrationApplications)
    .where(where)
    .orderBy(desc(registrationApplications.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    page,
    pageSize,
    total: Number(totalRow?.value ?? 0),
  };
}

export async function getAdminApplicationDetail(
  referenceId: string,
  role: AdminRole,
  options: { actorId: string; requestId?: string },
): Promise<AdminApplicationDetail | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, referenceId))
    .limit(1);

  if (!row) return null;

  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  let masked = "********";
  if (encryptionKey) {
    try {
      const plaintext = decryptSensitiveValue(
        row.identificationNumberEncrypted,
        encryptionKey,
      );
      masked = maskIdentificationNumber(row.identificationType, plaintext);
    } catch {
      masked = "********";
    }
  }

  const detail: AdminApplicationDetail = {
    referenceId: row.referenceId,
    eventId: row.eventId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    player: {
      fullName: row.fullName,
      dateOfBirth: row.dateOfBirth,
      country: row.country,
      city: row.city,
      email: row.email,
      phone: row.phone,
    },
    gaming: {
      gamerTag: row.gamerTag,
      game: row.game,
      platform: row.platform,
      gamingProfile: row.gamingProfile,
    },
    availability: {
      timezone: row.timezone,
      availability: row.availability,
    },
    socialHandles: row.socialHandles,
    socialFollow: {
      status: row.socialFollowStatus,
      attestation: row.socialFollowAttestation,
      attestationAt: row.socialFollowAttestationAt,
      platforms: (await listSocialFollowsForApplication(row.id))
        .filter((item) =>
          (REQUIRED_SOCIAL_PLATFORMS as readonly string[]).includes(item.platform),
        )
        .map((item) => ({
          platform: item.platform,
          applicantHandle: item.applicantHandle,
          verificationStatus: item.verificationStatus,
          verificationNotes: item.verificationNotes,
          reviewedBy: item.reviewedBy,
          reviewedAt: item.reviewedAt,
        })),
    },
    contactVerification: {
      emailStatus: row.emailVerificationStatus,
      emailVerifiedAt: row.emailVerifiedAt,
      phoneStatus: row.phoneVerificationStatus,
      phoneVerifiedAt: row.phoneVerifiedAt,
    },
    identity: {
      identificationType: row.identificationType,
      identificationNumberMasked: masked,
      status: row.identityVerificationStatus,
      reviewedAt: row.identityReviewedAt,
      reviewedBy: row.identityReviewedBy,
      notes: row.identityReviewNotes,
      meta: row.identityVerificationMeta,
    },
    consents: row.consents,
  };

  if (roleHasPermission(role, "guardian:view")) {
    const [guardian] = await db
      .select()
      .from(registrationGuardians)
      .where(eq(registrationGuardians.applicationId, row.id))
      .limit(1);

    detail.guardian = guardian
      ? {
          fullName: guardian.fullName,
          relationship: guardian.relationship,
          email: guardian.email,
          phone: guardian.phone,
          consentAt: guardian.consentAt,
        }
      : null;

    if (guardian) {
      await recordAdminAuditEvent({
        eventType: "GUARDIAN_DATA_VIEWED",
        actorId: options.actorId,
        actorRole: role,
        applicationId: row.id,
        applicationReference: row.referenceId,
        requestId: options.requestId,
      });
    }
  }

  if (roleHasPermission(role, "photo:view")) {
    detail.photo = {
      available: Boolean(row.playerPhotoBlobKey),
      fileName: row.playerPhotoMeta.fileName,
      mimeType: row.playerPhotoMeta.mimeType,
      accessPath: `/api/admin/applications/${row.referenceId}/photo`,
    };
  }

  return detail;
}

export async function revealAdminSensitiveIdentity(
  referenceId: string,
  role: AdminRole,
  options: { actorId: string; requestId?: string },
): Promise<AdminSensitiveIdentity | null> {
  if (!roleHasPermission(role, "identity:reveal")) {
    return null;
  }

  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    throw new Error("Encryption key is not configured");
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: registrationApplications.id,
      referenceId: registrationApplications.referenceId,
      identificationType: registrationApplications.identificationType,
      encrypted: registrationApplications.identificationNumberEncrypted,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, referenceId))
    .limit(1);

  if (!row) return null;

  const identificationNumber = decryptSensitiveValue(row.encrypted, encryptionKey);

  await recordAdminAuditEvent({
    eventType: "SENSITIVE_IDENTITY_VIEWED",
    actorId: options.actorId,
    actorRole: role,
    applicationId: row.id,
    applicationReference: row.referenceId,
    requestId: options.requestId,
  });

  return {
    identificationType: row.identificationType,
    identificationNumber,
  };
}

export async function submitIdentityReview(input: {
  referenceId: string;
  decision: "approved" | "rejected";
  notes?: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{ identityStatus: string }> {
  const notes = sanitizeReviewNotes(input.notes);
  if (input.decision === "rejected" && notes.length < 8) {
    throw new Error("Review notes are required when rejecting identity.");
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: registrationApplications.id,
      referenceId: registrationApplications.referenceId,
      identityStatus: registrationApplications.identityVerificationStatus,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, input.referenceId))
    .limit(1);

  if (!row) {
    throw new Error("Application not found");
  }

  if (!canTransitionIdentityReview(row.identityStatus, input.decision)) {
    throw new IdentityReviewConflictError();
  }

  const reviewedAt = new Date().toISOString();
  const identityStatus = input.decision === "approved" ? "verified" : "rejected";

  // Conditional update — only one concurrent reviewer wins.
  const [updated] = await db
    .update(registrationApplications)
    .set({
      identityVerificationStatus: identityStatus,
      identityReviewedAt: reviewedAt,
      identityReviewedBy: input.actorId,
      identityReviewNotes: notes || null,
      updatedAt: reviewedAt,
      // Intentionally does NOT change application status.
    })
    .where(
      and(
        eq(registrationApplications.id, row.id),
        eq(registrationApplications.identityVerificationStatus, "pending_review"),
      ),
    )
    .returning({ id: registrationApplications.id });

  if (!updated) {
    throw new IdentityReviewConflictError();
  }

  const eventType =
    input.decision === "approved"
      ? "IDENTITY_REVIEW_APPROVED"
      : "IDENTITY_REVIEW_REJECTED";

  await recordAdminAuditEvent({
    eventType,
    actorId: input.actorId,
    actorRole: input.actorRole,
    applicationId: row.id,
    applicationReference: row.referenceId,
    requestId: input.requestId,
    metadata: { decision: input.decision },
  });

  await recordAuditEvent({
    applicationId: row.id,
    eventType,
    actor: input.actorId,
    metadata: { decision: input.decision },
  });

  return { identityStatus };
}

export async function changeApplicationStatus(input: {
  referenceId: string;
  status: ApplicationStatus;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{ status: ApplicationStatus }> {
  const db = getDb();
  const [row] = await db
    .select({
      id: registrationApplications.id,
      referenceId: registrationApplications.referenceId,
      status: registrationApplications.status,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, input.referenceId))
    .limit(1);

  if (!row) {
    throw new Error("Application not found");
  }

  assertApplicationStatusTransition(row.status, input.status);

  const updatedAt = new Date().toISOString();
  const [updated] = await db
    .update(registrationApplications)
    .set({
      status: input.status,
      updatedAt,
    })
    .where(
      and(
        eq(registrationApplications.id, row.id),
        eq(registrationApplications.status, row.status),
      ),
    )
    .returning({ status: registrationApplications.status });

  if (!updated) {
    throw new ApplicationStatusTransitionError(
      "Application status was changed by another reviewer.",
    );
  }

  await recordAdminAuditEvent({
    eventType: "APPLICATION_STATUS_CHANGED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    applicationId: row.id,
    applicationReference: row.referenceId,
    requestId: input.requestId,
    metadata: { from: row.status, to: input.status },
  });

  await recordAuditEvent({
    applicationId: row.id,
    eventType: "APPLICATION_STATUS_CHANGED",
    actor: input.actorId,
    metadata: { from: row.status, to: input.status },
  });

  return { status: updated.status };
}

export async function listPendingIdentityReviews(options?: {
  page?: number;
  pageSize?: number;
}): Promise<{
  items: AdminApplicationListItem[];
  page: number;
  pageSize: number;
  total: number;
}> {
  return listAdminApplications({
    page: options?.page,
    pageSize: options?.pageSize,
    identityStatus: "pending_review",
  });
}

export async function listPendingSocialReviews(options?: {
  page?: number;
  pageSize?: number;
}): Promise<{
  items: AdminApplicationListItem[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const db = getDb();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = ALLOWED_PAGE_SIZES.has(options?.pageSize ?? 25)
    ? (options?.pageSize ?? 25)
    : 25;
  const offset = (page - 1) * pageSize;
  const where = eq(registrationApplications.socialFollowStatus, "pending_review");

  const [totalRow] = await db
    .select({ value: count() })
    .from(registrationApplications)
    .where(where);

  const rows = await db
    .select({
      referenceId: registrationApplications.referenceId,
      fullName: registrationApplications.fullName,
      gamerTag: registrationApplications.gamerTag,
      createdAt: registrationApplications.createdAt,
      eventId: registrationApplications.eventId,
      status: registrationApplications.status,
      identityVerificationStatus:
        registrationApplications.identityVerificationStatus,
      socialFollowStatus: registrationApplications.socialFollowStatus,
      emailVerificationStatus: registrationApplications.emailVerificationStatus,
      phoneVerificationStatus: registrationApplications.phoneVerificationStatus,
    })
    .from(registrationApplications)
    .where(where)
    .orderBy(desc(registrationApplications.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    page,
    pageSize,
    total: Number(totalRow?.value ?? 0),
  };
}

export async function listAdminAuditEvents(options?: {
  page?: number;
  pageSize?: number;
  referenceId?: string;
}): Promise<{ items: AdminAuditEvent[]; page: number; pageSize: number; total: number }> {
  const db = getDb();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = ALLOWED_PAGE_SIZES.has(options?.pageSize ?? 25)
    ? (options?.pageSize ?? 25)
    : 25;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (options?.referenceId) {
    conditions.push(eq(adminAuditEvents.applicationReference, options.referenceId));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(adminAuditEvents)
    .where(where);

  const rows = await db
    .select()
    .from(adminAuditEvents)
    .where(where)
    .orderBy(desc(adminAuditEvents.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      actorId: row.actorId,
      actorRole: row.actorRole,
      applicationReference: row.applicationReference,
      requestId: row.requestId,
      metadata: row.metadata,
      createdAt: row.createdAt,
    })),
    page,
    pageSize,
    total: Number(totalRow?.value ?? 0),
  };
}

export async function loadPrivatePlayerPhoto(referenceId: string): Promise<{
  body: ArrayBuffer;
  contentType: string;
  applicationId: string;
} | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: registrationApplications.id,
      blobKey: registrationApplications.playerPhotoBlobKey,
      meta: registrationApplications.playerPhotoMeta,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, referenceId))
    .limit(1);

  if (!row?.blobKey) return null;

  const token = serverEnv.blobReadWriteToken;
  if (!token) {
    throw new Error("Blob storage is not configured");
  }

  const result = await get(row.blobKey, {
    access: "private",
    token,
  });

  if (!result) return null;

  const streamResult = result as {
    stream?: ReadableStream;
    blob?: { contentType?: string };
  };

  if (!streamResult.stream) return null;

  const response = new Response(streamResult.stream);
  const body = await response.arrayBuffer();

  return {
    body,
    contentType:
      streamResult.blob?.contentType ?? row.meta.mimeType ?? "application/octet-stream",
    applicationId: row.id,
  };
}
