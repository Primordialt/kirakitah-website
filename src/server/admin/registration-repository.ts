import { and, desc, eq } from "drizzle-orm";
import type { IdentificationType } from "@/lib/identification";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  registrationGuardians,
  type IdentityVerificationMeta,
  type PlayerPhotoMeta,
  type RegistrationConsentsRecord,
} from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { decryptSensitiveValue } from "@/server/registration/pii";
import { recordAuditEvent } from "@/server/audit/events";

/**
 * Server-only administrative registration repository.
 * Do NOT expose these methods via public API routes in this step.
 */

export type ApplicationStatus =
  | "received"
  | "under_review"
  | "verified"
  | "rejected"
  | "withdrawn";

export interface ApplicationSummary {
  id: string;
  referenceId: string;
  eventId: string;
  status: string;
  fullName: string;
  country: string;
  city: string;
  gamerTag: string;
  game: string;
  platform: string;
  identityVerificationStatus: string;
  emailVerificationStatus: string;
  phoneVerificationStatus: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  identityReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationGeneralProjection extends ApplicationSummary {
  timezone: string;
  availability: string[];
  gamingProfile: string | null;
  socialHandles: Record<string, string> | null;
  consents: RegistrationConsentsRecord;
  playerPhotoMeta: PlayerPhotoMeta;
  identityVerificationMeta: IdentityVerificationMeta | null;
}

export interface SensitiveIdentityProjection {
  applicationId: string;
  identificationType: IdentificationType;
  identificationNumber: string;
}

export interface GuardianProjection {
  applicationId: string;
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  consentAt: string;
}

export interface PlayerPhotoProjection {
  applicationId: string;
  blobKey: string;
  meta: PlayerPhotoMeta;
}

function toSummary(
  row: typeof registrationApplications.$inferSelect,
): ApplicationSummary {
  return {
    id: row.id,
    referenceId: row.referenceId,
    eventId: row.eventId,
    status: row.status,
    fullName: row.fullName,
    country: row.country,
    city: row.city,
    gamerTag: row.gamerTag,
    game: row.game,
    platform: row.platform,
    identityVerificationStatus: row.identityVerificationStatus,
    emailVerificationStatus: row.emailVerificationStatus,
    phoneVerificationStatus: row.phoneVerificationStatus,
    emailVerifiedAt: row.emailVerifiedAt,
    phoneVerifiedAt: row.phoneVerifiedAt,
    identityReviewedAt: row.identityReviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getApplicationByReference(
  referenceId: string,
): Promise<ApplicationGeneralProjection | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, referenceId))
    .limit(1);

  if (!row) return null;

  return {
    ...toSummary(row),
    timezone: row.timezone,
    availability: row.availability,
    gamingProfile: row.gamingProfile,
    socialHandles: row.socialHandles,
    consents: row.consents,
    playerPhotoMeta: row.playerPhotoMeta,
    identityVerificationMeta: row.identityVerificationMeta,
  };
}

export async function listApplications(options?: {
  eventId?: string;
  status?: ApplicationStatus;
  limit?: number;
  offset?: number;
}): Promise<ApplicationSummary[]> {
  const db = getDb();
  const limit = Math.min(options?.limit ?? 50, 100);
  const offset = options?.offset ?? 0;

  const conditions = [];
  if (options?.eventId) {
    conditions.push(eq(registrationApplications.eventId, options.eventId));
  }
  if (options?.status) {
    conditions.push(eq(registrationApplications.status, options.status));
  }

  const rows = await db
    .select()
    .from(registrationApplications)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(registrationApplications.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map(toSummary);
}

export async function getPendingIdentityReviews(options?: {
  eventId?: string;
  limit?: number;
}): Promise<ApplicationSummary[]> {
  const db = getDb();
  const limit = Math.min(options?.limit ?? 50, 100);

  const conditions = [
    eq(registrationApplications.identityVerificationStatus, "pending_review"),
  ];
  if (options?.eventId) {
    conditions.push(eq(registrationApplications.eventId, options.eventId));
  }

  const rows = await db
    .select()
    .from(registrationApplications)
    .where(and(...conditions))
    .orderBy(registrationApplications.createdAt)
    .limit(limit);

  return rows.map(toSummary);
}

/**
 * Updates identity review outcome only.
 * Does NOT automatically approve or reject the application status.
 */
export async function updateIdentityReview(input: {
  applicationId: string;
  decision: "approved" | "rejected";
  reviewedBy: string;
  notes?: string;
}): Promise<void> {
  const db = getDb();
  const reviewedAt = new Date().toISOString();
  const identityStatus = input.decision === "approved" ? "verified" : "rejected";

  await db
    .update(registrationApplications)
    .set({
      identityVerificationStatus: identityStatus,
      identityReviewedAt: reviewedAt,
      identityReviewedBy: input.reviewedBy,
      identityReviewNotes: input.notes,
      updatedAt: reviewedAt,
    })
    .where(eq(registrationApplications.id, input.applicationId));

  await recordAuditEvent({
    applicationId: input.applicationId,
    eventType:
      input.decision === "approved"
        ? "IDENTITY_REVIEW_APPROVED"
        : "IDENTITY_REVIEW_REJECTED",
    actor: input.reviewedBy,
    metadata: { decision: input.decision },
  });
}

export async function updateApplicationStatus(input: {
  applicationId: string;
  status: ApplicationStatus;
  actor?: string;
}): Promise<void> {
  const db = getDb();
  const updatedAt = new Date().toISOString();

  await db
    .update(registrationApplications)
    .set({
      status: input.status,
      updatedAt,
    })
    .where(eq(registrationApplications.id, input.applicationId));

  await recordAuditEvent({
    applicationId: input.applicationId,
    eventType: "APPLICATION_STATUS_CHANGED",
    actor: input.actor,
    metadata: { status: input.status },
  });
}

export async function getSensitiveIdentityData(
  applicationId: string,
): Promise<SensitiveIdentityProjection | null> {
  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    throw new Error("REGISTRATION_PII_ENCRYPTION_KEY is not configured");
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: registrationApplications.id,
      identificationType: registrationApplications.identificationType,
      identificationNumberEncrypted:
        registrationApplications.identificationNumberEncrypted,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.id, applicationId))
    .limit(1);

  if (!row) return null;

  return {
    applicationId: row.id,
    identificationType: row.identificationType,
    identificationNumber: decryptSensitiveValue(
      row.identificationNumberEncrypted,
      encryptionKey,
    ),
  };
}

export async function getGuardianData(
  applicationId: string,
): Promise<GuardianProjection | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(registrationGuardians)
    .where(eq(registrationGuardians.applicationId, applicationId))
    .limit(1);

  if (!row) return null;

  return {
    applicationId: row.applicationId,
    fullName: row.fullName,
    relationship: row.relationship,
    email: row.email,
    phone: row.phone,
    consentAt: row.consentAt,
  };
}

export async function getPlayerPhotoProjection(
  applicationId: string,
): Promise<PlayerPhotoProjection | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: registrationApplications.id,
      blobKey: registrationApplications.playerPhotoBlobKey,
      meta: registrationApplications.playerPhotoMeta,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.id, applicationId))
    .limit(1);

  if (!row) return null;

  return {
    applicationId: row.id,
    blobKey: row.blobKey,
    meta: row.meta,
  };
}

/** Future cleanup documentation helper — no runtime worker. */
export const CHALLENGE_CLEANUP_STRATEGY = {
  approach: "vercel-cron-or-database-scheduled",
  note:
    "Expired verification challenges should be purged via Vercel Cron or a database scheduled job. Do not use process-local memory cleanup on serverless.",
} as const;
