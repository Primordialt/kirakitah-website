import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { COMPETITION_NAME } from "@/config/competition";
import { getDb } from "@/server/db";
import {
  participantProfiles,
  registrationApplications,
  registrationGuardians,
} from "@/server/db/schema";
import { insertPendingSocialFollows } from "@/server/registration/social-follow";
import { serverEnv } from "@/server/env";
import {
  DuplicateRegistrationError,
  PhotoValidationError,
  RateLimitError,
} from "@/server/registration/create-application";
import { hashClientIp } from "@/server/registration/pii";
import { generateReferenceId } from "@/server/registration/reference-id";
import {
  assertRegistrationOpen,
  RegistrationGateError,
} from "@/server/registration/registration-gate";
import { initiateContactVerification } from "@/server/verification/contact/initiate";
import {
  ApplicationGateError,
  assertCanApplyToTournament,
} from "@/server/participant/application-gate";

const ACTIVE_STATUSES = ["received", "under_review", "verified"] as const;

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; cause?: unknown };
  if (candidate.code === "23505") return true;
  if (typeof candidate.message === "string" && candidate.message.includes("23505")) {
    return true;
  }
  if (candidate.cause) return isUniqueViolation(candidate.cause);
  return false;
}

function duplicateFromUniqueViolation(error: unknown): DuplicateRegistrationError {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";

  if (message.includes("registration_event_phone_active_idx")) {
    return new DuplicateRegistrationError(
      "An active application already exists for this phone number.",
      "DUPLICATE_PHONE",
    );
  }
  if (message.includes("registration_event_email_active_idx")) {
    return new DuplicateRegistrationError(
      `This email address is already registered for ${COMPETITION_NAME}.`,
      "DUPLICATE_EMAIL",
    );
  }
  if (message.includes("registration_event_id_hash_active_idx")) {
    return new DuplicateRegistrationError(
      "An active application already exists for this identification number.",
      "DUPLICATE_IDENTITY",
    );
  }
  return new DuplicateRegistrationError(
    "An active application already exists for this applicant.",
    "DUPLICATE_EMAIL",
  );
}

export interface ApplyToTournamentBody {
  game: string;
  platform: string;
  gamingProfile?: string;
  timezone: string;
  availability: string[];
  socialHandles?: Record<string, string>;
  consents: {
    rules: true;
    terms: true;
    privacy: true;
    codeOfConduct: true;
    mediaConsent: true;
  };
  socialFollowAttestation: true;
}

export async function applyParticipantToTournament(input: {
  accountId: string;
  tournamentId: string;
  body: ApplyToTournamentBody;
  clientIp: string | null;
  requestId?: string;
}): Promise<{
  referenceId: string;
  status: "received";
  contactVerification: {
    email: { status: string; challengeId?: string; resendAvailableAt?: string };
    phone: { status: string; challengeId?: string; resendAvailableAt?: string };
  };
}> {
  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    throw new Error("REGISTRATION_PII_ENCRYPTION_KEY is not configured");
  }

  await assertRegistrationOpen(input.tournamentId);
  const gate = await assertCanApplyToTournament(
    input.accountId,
    input.tournamentId,
  );

  const db = getDb();
  const [profile] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.id, gate.profileId))
    .limit(1);

  if (!profile || profile.status !== "verified") {
    throw new ApplicationGateError(
      "PROFILE_NOT_VERIFIED",
      "Your profile must be verified before you can apply.",
    );
  }

  if (
    !profile.firstName ||
    !profile.lastName ||
    !profile.dateOfBirth ||
    !profile.country ||
    !profile.city ||
    !profile.phone ||
    !profile.phoneNormalized ||
    !profile.identificationType ||
    !profile.identificationNumberHash ||
    !profile.identificationNumberEncrypted ||
    !profile.gamerTag ||
    !profile.playerPhotoBlobKey ||
    !profile.playerPhotoMeta
  ) {
    throw new ApplicationGateError(
      "PROFILE_INCOMPLETE",
      "Your verified profile is missing required fields. Contact support.",
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const submitIpHash = input.clientIp
    ? hashClientIp(input.clientIp, encryptionKey)
    : null;

  // Soft rate limits aligned with legacy create path.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const emailMatches = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, input.tournamentId),
        sql`lower(${registrationApplications.email}) = ${gate.email.toLowerCase()}`,
        gte(registrationApplications.createdAt, oneDayAgo),
      ),
    )
    .limit(3);

  if (emailMatches.length >= 3) {
    throw new RateLimitError(
      "Too many registration attempts for this email address. Please try again later.",
    );
  }

  const [phoneHit] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, input.tournamentId),
        inArray(registrationApplications.status, [...ACTIVE_STATUSES]),
        eq(registrationApplications.phoneNormalized, profile.phoneNormalized),
      ),
    )
    .limit(1);

  if (phoneHit) {
    throw new DuplicateRegistrationError(
      "An active application already exists for this phone number.",
      "DUPLICATE_PHONE",
    );
  }

  const [identityHit] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, input.tournamentId),
        inArray(registrationApplications.status, [...ACTIVE_STATUSES]),
        eq(
          registrationApplications.identificationType,
          profile.identificationType,
        ),
        eq(
          registrationApplications.identificationNumberHash,
          profile.identificationNumberHash,
        ),
      ),
    )
    .limit(1);

  if (identityHit) {
    throw new DuplicateRegistrationError(
      "An active application already exists for this identification number.",
      "DUPLICATE_IDENTITY",
    );
  }

  const applicationId = randomUUID();
  let referenceId = generateReferenceId();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const collision = await db
      .select({ id: registrationApplications.id })
      .from(registrationApplications)
      .where(eq(registrationApplications.referenceId, referenceId))
      .limit(1);
    if (collision.length === 0) break;
    referenceId = generateReferenceId();
  }

  const acceptedAt = new Date().toISOString();
  const identityCheckedAt = acceptedAt;

  try {
    await db.insert(registrationApplications).values({
      id: applicationId,
      referenceId,
      eventId: input.tournamentId,
      status: "received",
      fullName,
      dateOfBirth: profile.dateOfBirth,
      country: profile.country,
      city: profile.city,
      email: gate.email,
      phone: profile.phone,
      phoneNormalized: profile.phoneNormalized,
      identificationType: profile.identificationType,
      identificationNumberHash: profile.identificationNumberHash,
      identificationNumberEncrypted: profile.identificationNumberEncrypted,
      gamerTag: profile.gamerTag,
      game: input.body.game.trim(),
      platform: input.body.platform.trim(),
      gamingProfile: input.body.gamingProfile?.trim() || null,
      timezone: input.body.timezone.trim(),
      availability: input.body.availability,
      socialHandles: input.body.socialHandles ?? null,
      // Reuse profile photo blob key reference (no re-upload).
      playerPhotoBlobKey: profile.playerPhotoBlobKey,
      playerPhotoMeta: profile.playerPhotoMeta,
      consents: {
        ...input.body.consents,
        acceptedAt,
      },
      identityVerificationStatus: "pending_review",
      identityVerificationMeta: {
        provider: "manual",
        checkedAt: identityCheckedAt,
        details:
          profile.identificationType === "nin"
            ? "NIN submitted for manual KIRAKITAH identity review. Automated provider lookup is not enabled."
            : "International passport submitted for manual KIRAKITAH identity review. Automated verification is not available.",
      },
      emailVerificationStatus: "verified",
      emailVerifiedAt: acceptedAt,
      phoneVerificationStatus: "pending",
      socialFollowStatus: "pending_review",
      socialFollowAttestation: true,
      socialFollowAttestationAt: acceptedAt,
      submitIpHash,
      participantAccountId: input.accountId,
    });

    await insertPendingSocialFollows({
      applicationId,
      handles: input.body.socialHandles ?? {},
    });

    if (profile.guardian) {
      await db.insert(registrationGuardians).values({
        applicationId,
        fullName: profile.guardian.fullName,
        relationship: profile.guardian.relationship,
        email: profile.guardian.email,
        phone: profile.guardian.phone,
        consentAt: profile.guardian.consentAt || acceptedAt,
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateFromUniqueViolation(error);
    }
    throw error;
  }

  const contactVerification = await initiateContactVerification({
    applicationId,
    referenceId,
    email: gate.email,
    phone: profile.phone,
    recipientFirstName: profile.firstName,
    emailAlreadyVerified: true,
  });

  return {
    referenceId,
    status: "received",
    contactVerification: {
      email: {
        status: contactVerification.email.status,
        challengeId: contactVerification.email.challengeId,
        resendAvailableAt: contactVerification.email.resendAvailableAt,
      },
      phone: {
        status: contactVerification.phone.status,
        challengeId: contactVerification.phone.challengeId,
        resendAvailableAt: contactVerification.phone.resendAvailableAt,
      },
    },
  };
}

export { RegistrationGateError, PhotoValidationError };
