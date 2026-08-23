import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  registrationGuardians,
} from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { storePlayerPhoto } from "@/server/registration/blob-storage";
import {
  encryptSensitiveValue,
  hashClientIp,
  hashSensitiveValue,
} from "@/server/registration/pii";
import { generateReferenceId } from "@/server/registration/reference-id";
import type { ParsedRegistrationRequest } from "@/server/registration/validation";
import { initiateContactVerification } from "@/server/verification/contact/initiate";

export class DuplicateRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRegistrationError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

const ACTIVE_STATUSES = ["received", "under_review", "verified"] as const;

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
  identificationType: ParsedRegistrationRequest["identificationType"],
  identificationNumberHash: string,
): Promise<void> {
  const db = getDb();

  const existing = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        inArray(registrationApplications.status, [...ACTIVE_STATUSES]),
        or(
          sql`lower(${registrationApplications.email}) = ${email.toLowerCase()}`,
          and(
            eq(registrationApplications.identificationType, identificationType),
            eq(
              registrationApplications.identificationNumberHash,
              identificationNumberHash,
            ),
          ),
        ),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new DuplicateRegistrationError(
      "An active application already exists for this email or identification number.",
    );
  }
}

export interface CreateRegistrationResult {
  referenceId: string;
  status: "received";
}

export async function createRegistrationApplication(
  input: ParsedRegistrationRequest,
  options: { clientIp: string | null },
): Promise<CreateRegistrationResult> {
  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    throw new Error("REGISTRATION_PII_ENCRYPTION_KEY is not configured");
  }

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
    input.identificationType,
    identificationNumberHash,
  );

  // Automated NIN/passport provider lookup is NOT invoked on registration.
  // Identity verification is manual (pending_review) until KIRAKITAH staff review.
  // Provider abstractions remain available for a future optional enablement.
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

  const { blobKey, meta } = await storePlayerPhoto(applicationId, input.playerPhoto);
  const acceptedAt = new Date().toISOString();

  try {
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
      submitIpHash,
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
    throw error;
  }

  await initiateContactVerification({
    applicationId,
    referenceId,
    email: input.email,
    phone: input.phone,
  });

  return {
    referenceId,
    status: "received",
  };
}
