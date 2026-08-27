import { and, eq, inArray, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { getDb } from "@/server/db";
import {
  participantAccounts,
  participantPasswordResetTokens,
  participantProfiles,
  participantSessions,
  registrationApplications,
  tournamentParticipants,
} from "@/server/db/schema";
import type { ApiErrorCode } from "@/server/errors";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import { clearParticipantSessionCookie } from "@/server/participant/auth/session";

export class ParticipantAccountDeletionError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status = 400) {
    super(message);
    this.name = "ParticipantAccountDeletionError";
    this.code = code;
    this.status = status;
  }
}

const ACTIVE_APPLICATION_STATUSES = [
  "received",
  "under_review",
  "verified",
] as const;

/**
 * Soft-delete / anonymize a participant account.
 * Preserves tournament application + participation rows for integrity.
 * Frees email/username uniqueness for future registration.
 * Blocks deletion while the account is linked to a selected tournament participant.
 */
export async function deleteParticipantAccount(input: {
  accountId: string;
  actor: string;
  actorType: "self" | "admin";
  confirmation: string;
}): Promise<void> {
  if (input.confirmation.trim().toUpperCase() !== "DELETE") {
    throw new ParticipantAccountDeletionError(
      "VALIDATION_ERROR",
      "Type DELETE to confirm account deletion.",
    );
  }

  const db = getDb();
  const [account] = await db
    .select({
      id: participantAccounts.id,
      active: participantAccounts.active,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, input.accountId))
    .limit(1);

  if (!account) {
    throw new ParticipantAccountDeletionError(
      "NOT_FOUND",
      "Participant account not found.",
      404,
    );
  }

  if (!account.active) {
    return;
  }

  const [blocking] = await db
    .select({ id: tournamentParticipants.id })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(
      and(
        eq(registrationApplications.participantAccountId, input.accountId),
        eq(tournamentParticipants.status, "selected"),
      ),
    )
    .limit(1);

  if (blocking) {
    throw new ParticipantAccountDeletionError(
      "CONFLICT",
      "Your account cannot currently be deleted because you have an active tournament participation record.",
      409,
    );
  }

  const now = new Date().toISOString();
  const suffix = createHash("sha256")
    .update(input.accountId)
    .digest("hex")
    .slice(0, 12);
  const anonymizedEmail = `deleted+${suffix}@deleted.kirakitah.local`;
  const anonymizedUsername = `deleted_${suffix}`;
  const unusablePasswordHash = createHash("sha256")
    .update(randomBytes(32))
    .digest("hex");

  await db
    .update(participantAccounts)
    .set({
      active: false,
      email: anonymizedEmail,
      emailNormalized: anonymizedEmail,
      username: anonymizedUsername,
      usernameNormalized: anonymizedUsername,
      passwordHash: unusablePasswordHash,
      emailVerifiedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    .where(eq(participantAccounts.id, input.accountId));

  await db
    .update(participantProfiles)
    .set({
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      country: null,
      city: null,
      phone: null,
      phoneNormalized: null,
      identificationType: null,
      identificationNumberHash: null,
      identificationNumberEncrypted: null,
      gamerTag: null,
      playerPhotoBlobKey: null,
      playerPhotoMeta: null,
      guardian: null,
      correctionReason: null,
      updatedAt: now,
    })
    .where(eq(participantProfiles.accountId, input.accountId));

  await db
    .update(participantSessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(participantSessions.accountId, input.accountId),
        isNull(participantSessions.revokedAt),
      ),
    );

  await db
    .update(participantPasswordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(participantPasswordResetTokens.accountId, input.accountId),
        isNull(participantPasswordResetTokens.usedAt),
      ),
    );

  await db
    .update(registrationApplications)
    .set({
      participantAccountId: null,
      updatedAt: now,
    })
    .where(eq(registrationApplications.participantAccountId, input.accountId));

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_ACCOUNT_DELETED",
    accountId: input.accountId,
    actor: input.actor,
    metadata: {
      actorType: input.actorType,
      mode: "anonymize_deactivate",
    },
  });
}

export async function deleteOwnParticipantAccount(input: {
  accountId: string;
  confirmation: string;
}): Promise<void> {
  await deleteParticipantAccount({
    accountId: input.accountId,
    actor: input.accountId,
    actorType: "self",
    confirmation: input.confirmation,
  });
  await clearParticipantSessionCookie();
}

export async function countActiveApplicationsForAccount(
  accountId: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.participantAccountId, accountId),
        inArray(registrationApplications.status, [
          ...ACTIVE_APPLICATION_STATUSES,
        ]),
      ),
    );
  return rows.length;
}
