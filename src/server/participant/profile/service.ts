import { put } from "@vercel/blob";
import { and, desc, eq, sql } from "drizzle-orm";
import type { IdentificationType } from "@/lib/identification";
import {
  normalizeIdentificationNumber,
  validateIdentificationNumber,
} from "@/lib/identification";
import {
  calculateAge,
  MINIMUM_TOURNAMENT_AGE,
  requiresGuardian,
} from "@/domain/registration";
import { getDb } from "@/server/db";
import {
  participantAccounts,
  participantProfiles,
  type ParticipantGuardianRecord,
  type PlayerPhotoMeta,
} from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import type { ApiErrorCode } from "@/server/errors";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import {
  notifyProfileCorrectionRequired,
  notifyProfileVerified,
} from "@/server/participant/communications";
import {
  calculateCompletionPercent,
  getCompletionSections,
  getMissingRequiredFields,
  isProfileComplete,
  type ProfileCompletionInput,
  type ProfileCompletionSection,
} from "@/server/participant/profile/completion";
import {
  detectPlayerPhotoMimeFromBytes,
  validatePlayerPhotoFile,
  validatePlayerPhotoMagicBytes,
} from "@/server/registration/blob-storage";
import {
  encryptSensitiveValue,
  hashSensitiveValue,
} from "@/server/registration/pii";
import {
  isValidNormalizedPhone,
  normalizePhoneForUniqueness,
} from "@/server/registration/phone-normalize";
import {
  APPROVED_EFOOTBALL_ACCOUNT_LOCKED_CODE,
  APPROVED_EFOOTBALL_ACCOUNT_LOCKED_MESSAGE,
  isGamerTagIdentityChange,
  normalizeGamerTagForStorage,
} from "@/server/registration/gamer-tag";

export class ParticipantProfileError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status = 400) {
    super(message);
    this.name = "ParticipantProfileError";
    this.code = code;
    this.status = status;
  }
}

export interface ParticipantProfileView {
  id: string;
  accountId: string;
  status:
    | "incomplete"
    | "submitted_for_review"
    | "needs_correction"
    | "verified";
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  identificationType: IdentificationType | null;
  hasIdentificationNumber: boolean;
  gamerTag: string | null;
  hasPlayerPhoto: boolean;
  playerPhotoMeta: PlayerPhotoMeta | null;
  guardian: ParticipantGuardianRecord | null;
  completionPercent: number;
  missingFields: string[];
  completionSections: ProfileCompletionSection[];
  submittedAt: string | null;
  verifiedAt: string | null;
  correctionReason: string | null;
  updatedAt: string;
}

function toCompletionInput(row: {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  identificationType: IdentificationType | null;
  identificationNumberHash: string | null;
  gamerTag: string | null;
  playerPhotoBlobKey: string | null;
  playerPhotoMeta: PlayerPhotoMeta | null;
  guardian: ParticipantGuardianRecord | null;
}): ProfileCompletionInput {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth,
    country: row.country,
    city: row.city,
    phone: row.phone,
    identificationType: row.identificationType,
    hasIdentificationNumber: Boolean(row.identificationNumberHash),
    gamerTag: row.gamerTag,
    playerPhotoBlobKey: row.playerPhotoBlobKey,
    playerPhotoMeta: row.playerPhotoMeta,
    guardian: row.guardian,
  };
}

function toView(row: typeof participantProfiles.$inferSelect): ParticipantProfileView {
  const completionInput = toCompletionInput(row);
  const completionPercent = calculateCompletionPercent(completionInput);
  return {
    id: row.id,
    accountId: row.accountId,
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth,
    country: row.country,
    city: row.city,
    phone: row.phone,
    identificationType: row.identificationType,
    hasIdentificationNumber: Boolean(row.identificationNumberHash),
    gamerTag: row.gamerTag,
    hasPlayerPhoto: Boolean(row.playerPhotoBlobKey && row.playerPhotoMeta),
    playerPhotoMeta: row.playerPhotoMeta ?? null,
    guardian: row.guardian ?? null,
    completionPercent,
    missingFields: getMissingRequiredFields(completionInput),
    completionSections: getCompletionSections(completionInput),
    submittedAt: row.submittedAt,
    verifiedAt: row.verifiedAt,
    correctionReason: row.correctionReason,
    updatedAt: row.updatedAt,
  };
}

async function storeParticipantPlayerPhoto(
  accountId: string,
  file: File,
): Promise<{ blobKey: string; meta: PlayerPhotoMeta }> {
  const token = serverEnv.blobReadWriteToken;
  if (!token) {
    throw new ParticipantProfileError(
      "CONFIGURATION_UNAVAILABLE",
      "Photo storage is not configured.",
      503,
    );
  }

  const basicError = validatePlayerPhotoFile(file);
  if (basicError) {
    throw new ParticipantProfileError("PHOTO_INVALID", basicError);
  }

  const magicError = await validatePlayerPhotoMagicBytes(file);
  if (magicError) {
    throw new ParticipantProfileError("PHOTO_INVALID", magicError);
  }

  const detectedMime =
    (await detectPlayerPhotoMimeFromBytes(file)) ?? file.type ?? "image/jpeg";

  const extension =
    detectedMime === "image/png"
      ? "png"
      : detectedMime === "image/webp"
        ? "webp"
        : "jpg";
  const pathname = `participants/${accountId}/player-photo.${extension}`;

  const blob = await put(pathname, file, {
    access: "private",
    token,
    addRandomSuffix: false,
    contentType: detectedMime,
  });

  return {
    blobKey: blob.pathname,
    meta: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: detectedMime,
    },
  };
}

export async function getParticipantProfile(
  accountId: string,
): Promise<ParticipantProfileView> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.accountId, accountId))
    .limit(1);

  if (!row) {
    throw new ParticipantProfileError(
      "NOT_FOUND",
      "Participant profile not found.",
      404,
    );
  }

  return toView(row);
}

export interface UpdateParticipantProfileInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  phone?: string;
  identificationType?: IdentificationType;
  identificationNumber?: string;
  gamerTag?: string;
  guardian?: {
    fullName: string;
    relationship: string;
    email: string;
    phone: string;
  } | null;
  playerPhoto?: File | null;
}

export async function updateParticipantProfile(
  accountId: string,
  input: UpdateParticipantProfileInput,
): Promise<ParticipantProfileView> {
  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    throw new ParticipantProfileError(
      "CONFIGURATION_UNAVAILABLE",
      "Profile security configuration is incomplete.",
      503,
    );
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.accountId, accountId))
    .limit(1);

  if (!existing) {
    throw new ParticipantProfileError(
      "NOT_FOUND",
      "Participant profile not found.",
      404,
    );
  }

  if (existing.status === "submitted_for_review") {
    throw new ParticipantProfileError(
      "PROFILE_ALREADY_SUBMITTED",
      "Your profile is under review and cannot be edited.",
      409,
    );
  }

  // Profile verification is the authoritative eFootball approval gate for KG926.
  // Other permitted fields may still be updated; gamerTag becomes immutable.
  if (
    existing.status === "verified" &&
    input.gamerTag !== undefined &&
    isGamerTagIdentityChange(existing.gamerTag, input.gamerTag)
  ) {
    await recordParticipantAuditEvent({
      eventType: "PARTICIPANT_APPROVED_EFOOTBALL_CHANGE_DENIED",
      accountId,
      actor: accountId,
      metadata: {
        profileId: existing.id,
        reason: "approved_efootball_locked",
      },
    });
    throw new ParticipantProfileError(
      APPROVED_EFOOTBALL_ACCOUNT_LOCKED_CODE,
      APPROVED_EFOOTBALL_ACCOUNT_LOCKED_MESSAGE,
      409,
    );
  }

  const updates: Partial<typeof participantProfiles.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.firstName !== undefined) {
    updates.firstName = input.firstName.trim();
  }
  if (input.lastName !== undefined) {
    updates.lastName = input.lastName.trim();
  }
  if (input.dateOfBirth !== undefined) {
    const age = calculateAge(input.dateOfBirth);
    if (age < MINIMUM_TOURNAMENT_AGE) {
      throw new ParticipantProfileError(
        "VALIDATION_ERROR",
        `You must be at least ${MINIMUM_TOURNAMENT_AGE} years old to participate.`,
      );
    }
    updates.dateOfBirth = input.dateOfBirth;
  }
  if (input.country !== undefined) {
    updates.country = input.country.trim();
  }
  if (input.city !== undefined) {
    updates.city = input.city.trim();
  }
  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    const phoneNormalized = normalizePhoneForUniqueness(phone);
    if (!isValidNormalizedPhone(phoneNormalized)) {
      throw new ParticipantProfileError(
        "VALIDATION_ERROR",
        "Enter a valid phone number.",
      );
    }
    updates.phone = phone;
    updates.phoneNormalized = phoneNormalized;
  }
  if (input.gamerTag !== undefined && existing.status !== "verified") {
    updates.gamerTag = normalizeGamerTagForStorage(input.gamerTag);
  }
  if (input.identificationType !== undefined) {
    updates.identificationType = input.identificationType;
  }
  if (input.identificationNumber !== undefined) {
    const idType =
      input.identificationType ?? existing.identificationType ?? "nin";
    const normalized = normalizeIdentificationNumber(
      idType,
      input.identificationNumber,
    );
    const idError = validateIdentificationNumber(idType, normalized);
    if (idError) {
      throw new ParticipantProfileError("VALIDATION_ERROR", idError);
    }
    updates.identificationNumberHash = hashSensitiveValue(
      normalized,
      encryptionKey,
    );
    updates.identificationNumberEncrypted = encryptSensitiveValue(
      normalized,
      encryptionKey,
    );
  }

  const dateOfBirth = input.dateOfBirth ?? existing.dateOfBirth;
  if (input.guardian !== undefined) {
    if (input.guardian === null) {
      updates.guardian = null;
    } else {
      updates.guardian = {
        fullName: input.guardian.fullName.trim(),
        relationship: input.guardian.relationship.trim(),
        email: input.guardian.email.trim().toLowerCase(),
        phone: input.guardian.phone.trim(),
        consentAt: new Date().toISOString(),
      };
    }
  } else if (dateOfBirth && !requiresGuardian(dateOfBirth)) {
    updates.guardian = null;
  }

  if (input.playerPhoto) {
    const stored = await storeParticipantPlayerPhoto(
      accountId,
      input.playerPhoto,
    );
    updates.playerPhotoBlobKey = stored.blobKey;
    updates.playerPhotoMeta = stored.meta;
  }

  const mergedForCompletion: ProfileCompletionInput = {
    firstName: updates.firstName ?? existing.firstName,
    lastName: updates.lastName ?? existing.lastName,
    dateOfBirth: updates.dateOfBirth ?? existing.dateOfBirth,
    country: updates.country ?? existing.country,
    city: updates.city ?? existing.city,
    phone: updates.phone ?? existing.phone,
    identificationType:
      updates.identificationType ?? existing.identificationType,
    hasIdentificationNumber: Boolean(
      updates.identificationNumberHash ?? existing.identificationNumberHash,
    ),
    gamerTag: updates.gamerTag ?? existing.gamerTag,
    playerPhotoBlobKey:
      updates.playerPhotoBlobKey ?? existing.playerPhotoBlobKey,
    playerPhotoMeta: updates.playerPhotoMeta ?? existing.playerPhotoMeta,
    guardian:
      updates.guardian !== undefined
        ? (updates.guardian as ParticipantGuardianRecord | null)
        : existing.guardian,
  };

  updates.completionPercent = calculateCompletionPercent(mergedForCompletion);

  // Editing after correction resets status to incomplete until re-submit.
  // Verified profiles keep verified status (eFootball remains locked).
  if (existing.status === "needs_correction") {
    updates.status = "incomplete";
    updates.correctionReason = null;
  }

  const [updated] = await db
    .update(participantProfiles)
    .set(updates)
    .where(
      and(
        eq(participantProfiles.id, existing.id),
        eq(participantProfiles.status, existing.status),
      ),
    )
    .returning();

  if (!updated) {
    throw new ParticipantProfileError(
      "CONFLICT",
      "Your profile was updated by another request. Refresh and try again.",
      409,
    );
  }

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_PROFILE_UPDATED",
    accountId,
    actor: accountId,
    metadata: {
      completionPercent: updates.completionPercent ?? existing.completionPercent,
      efootballLocked: existing.status === "verified",
    },
  });

  return toView(updated);
}

export async function submitProfileForReview(
  accountId: string,
): Promise<ParticipantProfileView> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.accountId, accountId))
    .limit(1);

  if (!existing) {
    throw new ParticipantProfileError(
      "NOT_FOUND",
      "Participant profile not found.",
      404,
    );
  }

  if (existing.status === "submitted_for_review") {
    throw new ParticipantProfileError(
      "PROFILE_ALREADY_SUBMITTED",
      "Your profile is already under review.",
      409,
    );
  }

  if (existing.status === "verified") {
    throw new ParticipantProfileError(
      "FORBIDDEN",
      "Your profile is already verified.",
      403,
    );
  }

  const completionInput = toCompletionInput(existing);
  const completionPercent = calculateCompletionPercent(completionInput);
  if (!isProfileComplete(completionInput) || completionPercent < 100) {
    throw new ParticipantProfileError(
      "PROFILE_INCOMPLETE",
      "Complete all required profile fields before submitting for review.",
      400,
    );
  }

  const now = new Date().toISOString();
  const [updated] = await db
    .update(participantProfiles)
    .set({
      status: "submitted_for_review",
      completionPercent: 100,
      submittedAt: now,
      correctionReason: null,
      updatedAt: now,
    })
    .where(eq(participantProfiles.id, existing.id))
    .returning();

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_PROFILE_SUBMITTED",
    accountId,
    actor: accountId,
    metadata: { profileId: existing.id },
  });

  return toView(updated);
}

export async function adminApproveProfile(input: {
  profileId: string;
  actorId: string;
}): Promise<ParticipantProfileView> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.id, input.profileId))
    .limit(1);

  if (!existing) {
    throw new ParticipantProfileError(
      "NOT_FOUND",
      "Participant profile not found.",
      404,
    );
  }

  if (existing.status !== "submitted_for_review") {
    throw new ParticipantProfileError(
      "CONFLICT",
      "Only profiles submitted for review can be approved.",
      409,
    );
  }

  const completionInput = toCompletionInput(existing);
  if (
    !isProfileComplete(completionInput) ||
    existing.completionPercent < 100
  ) {
    throw new ParticipantProfileError(
      "PROFILE_INCOMPLETE",
      "Profile must be 100% complete before it can be verified.",
      400,
    );
  }

  const now = new Date().toISOString();
  const [updated] = await db
    .update(participantProfiles)
    .set({
      status: "verified",
      verifiedAt: now,
      verifiedBy: input.actorId,
      correctionReason: null,
      updatedAt: now,
    })
    .where(eq(participantProfiles.id, existing.id))
    .returning();

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_PROFILE_APPROVED",
    accountId: existing.accountId,
    actor: input.actorId,
    metadata: { profileId: existing.id },
  });

  const [account] = await db
    .select({ email: participantAccounts.email })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, existing.accountId))
    .limit(1);
  if (account?.email) {
    await notifyProfileVerified({ email: account.email });
  }

  return toView(updated);
}

export async function adminRequireCorrection(input: {
  profileId: string;
  actorId: string;
  reason: string;
}): Promise<ParticipantProfileView> {
  const reason = input.reason.trim();
  if (reason.length < 8) {
    throw new ParticipantProfileError(
      "VALIDATION_ERROR",
      "A public-safe correction reason of at least 8 characters is required.",
    );
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.id, input.profileId))
    .limit(1);

  if (!existing) {
    throw new ParticipantProfileError(
      "NOT_FOUND",
      "Participant profile not found.",
      404,
    );
  }

  if (existing.status !== "submitted_for_review") {
    throw new ParticipantProfileError(
      "CONFLICT",
      "Only profiles submitted for review can be returned for correction.",
      409,
    );
  }

  const now = new Date().toISOString();
  const [updated] = await db
    .update(participantProfiles)
    .set({
      status: "needs_correction",
      correctionReason: reason,
      verifiedAt: null,
      verifiedBy: null,
      updatedAt: now,
    })
    .where(eq(participantProfiles.id, existing.id))
    .returning();

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_PROFILE_REJECTED",
    accountId: existing.accountId,
    actor: input.actorId,
    metadata: { profileId: existing.id },
  });

  const [account] = await db
    .select({ email: participantAccounts.email })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, existing.accountId))
    .limit(1);
  if (account?.email) {
    await notifyProfileCorrectionRequired({
      email: account.email,
      reason,
    });
  }

  return toView(updated);
}

export async function getAccountWithProfile(accountId: string) {
  const db = getDb();
  const [account] = await db
    .select({
      id: participantAccounts.id,
      email: participantAccounts.email,
      username: participantAccounts.username,
      active: participantAccounts.active,
      emailVerifiedAt: participantAccounts.emailVerifiedAt,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new ParticipantProfileError(
      "NOT_FOUND",
      "Participant account not found.",
      404,
    );
  }

  const profile = await getParticipantProfile(accountId);
  return { account, profile };
}

export type ParticipantProfileStatus = ParticipantProfileView["status"];

export type ParticipantProfileListItem = {
  id: string;
  accountId: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  gamerTag: string | null;
  status: ParticipantProfileStatus;
  completionPercent: number;
  submittedAt: string | null;
  correctionReason: string | null;
  updatedAt: string;
};

export async function listParticipantProfiles(input: {
  status?: ParticipantProfileStatus;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: ParticipantProfileListItem[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const db = getDb();

  const whereClause = input.status
    ? eq(participantProfiles.status, input.status)
    : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participantProfiles)
    .where(whereClause);

  const rows = await db
    .select({
      id: participantProfiles.id,
      accountId: participantProfiles.accountId,
      username: participantAccounts.username,
      email: participantAccounts.email,
      firstName: participantProfiles.firstName,
      lastName: participantProfiles.lastName,
      gamerTag: participantProfiles.gamerTag,
      status: participantProfiles.status,
      completionPercent: participantProfiles.completionPercent,
      submittedAt: participantProfiles.submittedAt,
      correctionReason: participantProfiles.correctionReason,
      updatedAt: participantProfiles.updatedAt,
    })
    .from(participantProfiles)
    .innerJoin(
      participantAccounts,
      eq(participantAccounts.id, participantProfiles.accountId),
    )
    .where(whereClause)
    .orderBy(desc(participantProfiles.submittedAt), desc(participantProfiles.updatedAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    page,
    pageSize,
    total: countRow?.count ?? 0,
  };
}
