import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  registrationGuardians,
} from "@/server/db/schema";
import { insertPendingSocialFollows } from "@/server/registration/social-follow";
import { serverEnv } from "@/server/env";
import {
  deletePlayerPhoto,
  storePlayerPhoto,
} from "@/server/registration/blob-storage";
import {
  encryptSensitiveValue,
  hashClientIp,
  hashSensitiveValue,
} from "@/server/registration/pii";
import { normalizePhoneForUniqueness } from "@/server/registration/phone-normalize";
import { generateReferenceId } from "@/server/registration/reference-id";
import { assertRegistrationOpen } from "@/server/registration/registration-gate";
import type { ParsedRegistrationRequest } from "@/server/registration/validation";
import { initiateContactVerification } from "@/server/verification/contact/initiate";

export type DuplicateConflictCode =
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_PHONE"
  | "DUPLICATE_IDENTITY";

export class DuplicateRegistrationError extends Error {
  readonly code: DuplicateConflictCode;

  constructor(message: string, code: DuplicateConflictCode = "DUPLICATE_EMAIL") {
    super(message);
    this.name = "DuplicateRegistrationError";
    this.code = code;
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class PhotoValidationError extends Error {
  readonly code: "PHOTO_INVALID" | "PHOTO_TOO_LARGE";

  constructor(message: string, code: "PHOTO_INVALID" | "PHOTO_TOO_LARGE") {
    super(message);
    this.name = "PhotoValidationError";
    this.code = code;
  }
}

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
      "An active application already exists for this email address.",
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

async function assertWithinRateLimits(
  email: string,
  eventId: string,
  submitIpHash: string | null,
): Promise<void> {
  const db = getDb();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const emailMatches = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        sql`lower(${registrationApplications.email}) = ${email.toLowerCase()}`,
        gte(registrationApplications.createdAt, oneDayAgo),
      ),
    )
    .limit(3);

  if (emailMatches.length >= 3) {
    throw new RateLimitError(
      "Too many registration attempts for this email address. Please try again later.",
    );
  }

  if (submitIpHash) {
    const ipMatches = await db
      .select({ id: registrationApplications.id })
      .from(registrationApplications)
      .where(
        and(
          eq(registrationApplications.submitIpHash, submitIpHash),
          gte(registrationApplications.createdAt, oneHourAgo),
        ),
      )
      .limit(5);

    if (ipMatches.length >= 5) {
      throw new RateLimitError(
        "Too many registration attempts from this network. Please try again later.",
      );
    }
  }
}

async function assertNoActiveDuplicate(
  eventId: string,
  email: string,
  phoneNormalized: string,
  identificationType: ParsedRegistrationRequest["identificationType"],
  identificationNumberHash: string,
): Promise<void> {
  const db = getDb();

  const [emailHit] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        inArray(registrationApplications.status, [...ACTIVE_STATUSES]),
        sql`lower(${registrationApplications.email}) = ${email.toLowerCase()}`,
      ),
    )
    .limit(1);

  if (emailHit) {
    throw new DuplicateRegistrationError(
      "An active application already exists for this email address.",
      "DUPLICATE_EMAIL",
    );
  }

  const [phoneHit] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        inArray(registrationApplications.status, [...ACTIVE_STATUSES]),
        eq(registrationApplications.phoneNormalized, phoneNormalized),
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
        eq(registrationApplications.eventId, eventId),
        inArray(registrationApplications.status, [...ACTIVE_STATUSES]),
        eq(registrationApplications.identificationType, identificationType),
        eq(
          registrationApplications.identificationNumberHash,
          identificationNumberHash,
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
}

export interface CreateRegistrationResult {
  referenceId: string;
  status: "received";
  contactVerification: {
    email: {
      status: string;
      challengeId?: string;
      resendAvailableAt?: string;
    };
    phone: {
      status: string;
      challengeId?: string;
      resendAvailableAt?: string;
    };
  };
}

export async function createRegistrationApplication(
  input: ParsedRegistrationRequest,
  options: { clientIp: string | null; requestId?: string },
): Promise<CreateRegistrationResult> {
  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    throw new Error("REGISTRATION_PII_ENCRYPTION_KEY is not configured");
  }

  await assertRegistrationOpen(input.eventId);

  const phoneNormalized = normalizePhoneForUniqueness(input.phone);

  const identificationNumberHash = hashSensitiveValue(
    input.identificationNumber,
    encryptionKey,
  );
  const submitIpHash = options.clientIp
    ? hashClientIp(options.clientIp, encryptionKey)
    : null;

  await assertWithinRateLimits(input.email, input.eventId, submitIpHash);
  await assertNoActiveDuplicate(
    input.eventId,
    input.email,
    phoneNormalized,
    input.identificationType,
    identificationNumberHash,
  );

  // Automated NIN/passport provider lookup is NOT invoked on registration.
  // Identity verification is manual (pending_review) until KIRAKITAH staff review.
  const identityCheckedAt = new Date().toISOString();

  const db = getDb();
  const applicationId = randomUUID();
  let referenceId = generateReferenceId();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const collision = await db
      .select({ id: registrationApplications.id })
      .from(registrationApplications)
      .where(eq(registrationApplications.referenceId, referenceId))
      .limit(1);

    if (collision.length === 0) {
      break;
    }
    referenceId = generateReferenceId();
  }

  let blobKey: string | null = null;
  try {
    const stored = await storePlayerPhoto(applicationId, input.playerPhoto);
    blobKey = stored.blobKey;
    const { meta } = stored;
    const acceptedAt = new Date().toISOString();

    await db.insert(registrationApplications).values({
      id: applicationId,
      referenceId,
      eventId: input.eventId,
      status: "received",
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      country: input.country,
      city: input.city,
      email: input.email,
      phone: input.phone,
      phoneNormalized,
      identificationType: input.identificationType,
      identificationNumberHash,
      identificationNumberEncrypted: encryptSensitiveValue(
        input.identificationNumber,
        encryptionKey,
      ),
      gamerTag: input.gamerTag,
      game: input.game,
      platform: input.platform,
      gamingProfile: input.gamingProfile,
      timezone: input.timezone,
      availability: input.availability,
      socialHandles: input.socialHandles,
      playerPhotoBlobKey: blobKey,
      playerPhotoMeta: meta,
      consents: {
        ...input.consents,
        acceptedAt,
      },
      identityVerificationStatus: "pending_review",
      identityVerificationMeta: {
        provider: "manual",
        checkedAt: identityCheckedAt,
        details:
          input.identificationType === "nin"
            ? "NIN submitted for manual KIRAKITAH identity review. Automated provider lookup is not enabled."
            : "International passport submitted for manual KIRAKITAH identity review. Automated verification is not available.",
      },
      // Contact OTP may be deferred (MVP); never mark verified without ownership proof.
      emailVerificationStatus: "pending",
      phoneVerificationStatus: "pending",
      // Social follow is attested at submit but remains pending_review until manual admin verification.
      socialFollowStatus: "pending_review",
      socialFollowAttestation: true,
      socialFollowAttestationAt: acceptedAt,
      submitIpHash,
    });

    await insertPendingSocialFollows({
      applicationId,
      handles: input.socialHandles ?? {},
    });

    if (input.guardian) {
      await db.insert(registrationGuardians).values({
        applicationId,
        fullName: input.guardian.fullName,
        relationship: input.guardian.relationship,
        email: input.guardian.email,
        phone: input.guardian.phone,
        consentAt: acceptedAt,
      });
    }
  } catch (error) {
    if (blobKey) {
      await deletePlayerPhoto(blobKey);
    }

    if (isUniqueViolation(error)) {
      throw duplicateFromUniqueViolation(error);
    }

    if (error instanceof Error) {
      if (error.message.includes("too large") || error.message.includes("or smaller")) {
        throw new PhotoValidationError(error.message, "PHOTO_TOO_LARGE");
      }
      if (
        error.message.includes("Player photo") ||
        error.message.includes("JPEG") ||
        error.message.includes("file type")
      ) {
        throw new PhotoValidationError(error.message, "PHOTO_INVALID");
      }
    }

    throw error;
  }

  if (options.requestId && serverEnv.nodeEnv !== "test") {
    console.info(
      JSON.stringify({
        level: "info",
        event: "registration.created",
        requestId: options.requestId,
        referenceId,
        status: "received",
        identityVerificationStatus: "pending_review",
      }),
    );
  }

  const contactVerification = await initiateContactVerification({
    applicationId,
    referenceId,
    email: input.email,
    phone: input.phone,
    recipientFirstName: input.fullName?.trim().split(/\s+/)[0],
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
