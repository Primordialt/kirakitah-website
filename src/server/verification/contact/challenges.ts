import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { randomInt } from "crypto";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  registrationVerificationChallenges,
} from "@/server/db/schema";
import type { ApiErrorCode } from "@/server/errors";
import { serverEnv } from "@/server/env";
import { hashSensitiveValue } from "@/server/registration/pii";
import { recordAuditEvent } from "@/server/audit/events";
import {
  VERIFICATION_ATTEMPT_MAX_PER_HOUR,
  VERIFICATION_CHALLENGE_TTL_MINUTES,
  VERIFICATION_CHALLENGE_TTL_MS,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_OTP_MAX,
  VERIFICATION_OTP_MIN,
  VERIFICATION_RESEND_COOLDOWN_MS,
  VERIFICATION_RESEND_MAX_PER_HOUR,
} from "@/server/verification/constants";
import { getVerificationProviders } from "@/server/verification";
import type {
  ContactChannelInitResult,
  ContactVerificationChannel,
} from "@/server/verification/types";

export class ContactVerificationError extends Error {
  readonly code: ApiErrorCode;
  readonly resendAvailableAt?: string;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { resendAvailableAt?: string },
  ) {
    super(message);
    this.name = "ContactVerificationError";
    this.code = code;
    this.resendAvailableAt = options?.resendAvailableAt;
  }
}

function generateSecureOtp(): string {
  return randomInt(VERIFICATION_OTP_MIN, VERIFICATION_OTP_MAX).toString();
}

function destinationForChannel(
  channel: ContactVerificationChannel,
  email: string,
  phone: string,
): string {
  return channel === "email" ? email.toLowerCase() : phone;
}

async function assertResendRateLimit(
  applicationId: string,
  channel: ContactVerificationChannel,
): Promise<void> {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const recent = await db
    .select({ id: registrationVerificationChallenges.id })
    .from(registrationVerificationChallenges)
    .where(
      and(
        eq(registrationVerificationChallenges.applicationId, applicationId),
        eq(registrationVerificationChallenges.channel, channel),
        gte(registrationVerificationChallenges.createdAt, oneHourAgo),
      ),
    )
    .limit(VERIFICATION_RESEND_MAX_PER_HOUR + 1);

  if (recent.length >= VERIFICATION_RESEND_MAX_PER_HOUR) {
    throw new ContactVerificationError(
      "VERIFICATION_RATE_LIMITED",
      "Too many verification requests. Please try again later.",
    );
  }
}

async function assertVerifyAttemptRateLimit(
  applicationId: string,
  channel: ContactVerificationChannel,
): Promise<void> {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const recent = await db
    .select({
      attempts: registrationVerificationChallenges.attempts,
    })
    .from(registrationVerificationChallenges)
    .where(
      and(
        eq(registrationVerificationChallenges.applicationId, applicationId),
        eq(registrationVerificationChallenges.channel, channel),
        gte(registrationVerificationChallenges.createdAt, oneHourAgo),
      ),
    );

  const totalAttempts = recent.reduce((sum, row) => sum + row.attempts, 0);
  if (totalAttempts >= VERIFICATION_ATTEMPT_MAX_PER_HOUR) {
    throw new ContactVerificationError(
      "VERIFICATION_RATE_LIMITED",
      "Too many verification attempts. Please try again later.",
    );
  }
}

async function getLatestChallenge(
  applicationId: string,
  channel: ContactVerificationChannel,
) {
  const db = getDb();
  const [latest] = await db
    .select()
    .from(registrationVerificationChallenges)
    .where(
      and(
        eq(registrationVerificationChallenges.applicationId, applicationId),
        eq(registrationVerificationChallenges.channel, channel),
      ),
    )
    .orderBy(desc(registrationVerificationChallenges.createdAt))
    .limit(1);

  return latest ?? null;
}

/**
 * Generate OTP → deliver via provider → persist challenge only on successful delivery.
 * Does not store plaintext OTP or destination.
 */
export async function createAndDeliverChallenge(options: {
  applicationId: string;
  referenceId: string;
  channel: ContactVerificationChannel;
  email: string;
  phone: string;
  supersedePrevious?: boolean;
}): Promise<ContactChannelInitResult> {
  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    return {
      status: "unavailable",
      provider: "none",
      message: "Verification security configuration is incomplete.",
    };
  }

  const providers = getVerificationProviders();
  const deliveryProvider =
    options.channel === "email" ? providers.email : providers.phone;

  if (deliveryProvider.providerId === "none") {
    return { status: "skipped", provider: "none" };
  }

  await assertResendRateLimit(options.applicationId, options.channel);

  const latest = await getLatestChallenge(options.applicationId, options.channel);
  if (latest && !latest.verifiedAt) {
    const ageMs = Date.now() - new Date(latest.createdAt).getTime();
    if (ageMs < VERIFICATION_RESEND_COOLDOWN_MS) {
      const resendAvailableAt = new Date(
        new Date(latest.createdAt).getTime() + VERIFICATION_RESEND_COOLDOWN_MS,
      ).toISOString();
      throw new ContactVerificationError(
        "VERIFICATION_COOLDOWN",
        "Please wait before requesting another verification code.",
        { resendAvailableAt },
      );
    }
  }

  const code = generateSecureOtp();
  const expiresAt = new Date(Date.now() + VERIFICATION_CHALLENGE_TTL_MS).toISOString();
  const destination = destinationForChannel(
    options.channel,
    options.email,
    options.phone,
  );

  const delivery =
    options.channel === "email"
      ? await providers.email.sendVerificationEmail({
          email: options.email,
          referenceId: options.referenceId,
          code,
          expiresInMinutes: VERIFICATION_CHALLENGE_TTL_MINUTES,
        })
      : await providers.phone.sendVerificationSms({
          phone: options.phone,
          referenceId: options.referenceId,
          code,
          expiresInMinutes: VERIFICATION_CHALLENGE_TTL_MINUTES,
        });

  if (delivery.status === "skipped") {
    return { status: "skipped", provider: delivery.provider };
  }

  if (delivery.status !== "sent") {
    return {
      status: "unavailable",
      provider: delivery.provider,
      message: delivery.message ?? "Verification provider is unavailable.",
    };
  }

  const db = getDb();

  if (options.supersedePrevious !== false) {
    await db
      .update(registrationVerificationChallenges)
      .set({ supersededAt: new Date().toISOString() })
      .where(
        and(
          eq(registrationVerificationChallenges.applicationId, options.applicationId),
          eq(registrationVerificationChallenges.channel, options.channel),
          isNull(registrationVerificationChallenges.verifiedAt),
          isNull(registrationVerificationChallenges.supersededAt),
        ),
      );
  }

  const [challenge] = await db
    .insert(registrationVerificationChallenges)
    .values({
      applicationId: options.applicationId,
      channel: options.channel,
      destinationHash: hashSensitiveValue(destination, encryptionKey),
      codeHash: hashSensitiveValue(code, encryptionKey),
      maxAttempts: VERIFICATION_MAX_ATTEMPTS,
      expiresAt,
    })
    .returning({
      id: registrationVerificationChallenges.id,
      createdAt: registrationVerificationChallenges.createdAt,
    });

  return {
    status: "pending",
    challengeId: challenge.id,
    provider: delivery.provider,
    resendAvailableAt: new Date(
      new Date(challenge.createdAt).getTime() + VERIFICATION_RESEND_COOLDOWN_MS,
    ).toISOString(),
  };
}

export async function verifyContactChallenge(options: {
  referenceId: string;
  channel: ContactVerificationChannel;
  challengeId: string;
  code: string;
}): Promise<{ verified: true } | never> {
  const encryptionKey = serverEnv.registrationPiiEncryptionKey;
  if (!encryptionKey) {
    throw new ContactVerificationError(
      "VERIFICATION_NOT_CONFIGURED",
      "Verification is not configured.",
    );
  }

  const db = getDb();

  const [application] = await db
    .select({
      id: registrationApplications.id,
      emailVerificationStatus: registrationApplications.emailVerificationStatus,
      phoneVerificationStatus: registrationApplications.phoneVerificationStatus,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, options.referenceId))
    .limit(1);

  // Enumeration-safe: do not distinguish missing application vs missing challenge.
  if (!application) {
    throw new ContactVerificationError(
      "VERIFICATION_NOT_FOUND",
      "Verification challenge not found.",
    );
  }

  const alreadyVerified =
    options.channel === "email"
      ? application.emailVerificationStatus === "verified"
      : application.phoneVerificationStatus === "verified";

  if (alreadyVerified) {
    throw new ContactVerificationError(
      "VERIFICATION_ALREADY_VERIFIED",
      "This contact channel is already verified.",
    );
  }

  await assertVerifyAttemptRateLimit(application.id, options.channel);

  const [challenge] = await db
    .select()
    .from(registrationVerificationChallenges)
    .where(eq(registrationVerificationChallenges.id, options.challengeId))
    .limit(1);

  if (
    !challenge ||
    challenge.applicationId !== application.id ||
    challenge.channel !== options.channel
  ) {
    throw new ContactVerificationError(
      "VERIFICATION_NOT_FOUND",
      "Verification challenge not found.",
    );
  }

  if (challenge.supersededAt) {
    throw new ContactVerificationError(
      "VERIFICATION_NOT_FOUND",
      "Verification challenge not found.",
    );
  }

  if (challenge.verifiedAt) {
    throw new ContactVerificationError(
      "VERIFICATION_ALREADY_USED",
      "This verification code has already been used.",
    );
  }

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new ContactVerificationError(
      "VERIFICATION_EXPIRED",
      "Verification code has expired.",
    );
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new ContactVerificationError(
      "VERIFICATION_EXHAUSTED",
      "Too many verification attempts. Request a new code.",
    );
  }

  const codeMatches =
    challenge.codeHash === hashSensitiveValue(options.code, encryptionKey);

  if (!codeMatches) {
    const [updated] = await db
      .update(registrationVerificationChallenges)
      .set({ attempts: sql`${registrationVerificationChallenges.attempts} + 1` })
      .where(
        and(
          eq(registrationVerificationChallenges.id, challenge.id),
          isNull(registrationVerificationChallenges.verifiedAt),
          isNull(registrationVerificationChallenges.supersededAt),
          sql`${registrationVerificationChallenges.attempts} < ${registrationVerificationChallenges.maxAttempts}`,
        ),
      )
      .returning({
        attempts: registrationVerificationChallenges.attempts,
        maxAttempts: registrationVerificationChallenges.maxAttempts,
      });

    if (updated && updated.attempts >= updated.maxAttempts) {
      throw new ContactVerificationError(
        "VERIFICATION_EXHAUSTED",
        "Too many verification attempts. Request a new code.",
      );
    }

    throw new ContactVerificationError(
      "VERIFICATION_INVALID",
      "Invalid verification code.",
    );
  }

  const verifiedAt = new Date().toISOString();

  // Conditional consume — only one concurrent request may succeed.
  const [consumed] = await db
    .update(registrationVerificationChallenges)
    .set({
      verifiedAt,
      attempts: sql`${registrationVerificationChallenges.attempts} + 1`,
    })
    .where(
      and(
        eq(registrationVerificationChallenges.id, challenge.id),
        isNull(registrationVerificationChallenges.verifiedAt),
        isNull(registrationVerificationChallenges.supersededAt),
        sql`${registrationVerificationChallenges.attempts} < ${registrationVerificationChallenges.maxAttempts}`,
        sql`${registrationVerificationChallenges.expiresAt} > now()`,
        eq(
          registrationVerificationChallenges.codeHash,
          hashSensitiveValue(options.code, encryptionKey),
        ),
      ),
    )
    .returning({ id: registrationVerificationChallenges.id });

  if (!consumed) {
    throw new ContactVerificationError(
      "VERIFICATION_ALREADY_USED",
      "This verification code has already been used.",
    );
  }

  if (options.channel === "email") {
    await db
      .update(registrationApplications)
      .set({
        emailVerificationStatus: "verified",
        emailVerifiedAt: verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(eq(registrationApplications.id, application.id));

    await recordAuditEvent({
      applicationId: application.id,
      eventType: "EMAIL_VERIFIED",
      metadata: { channel: "email" },
    });
  } else {
    await db
      .update(registrationApplications)
      .set({
        phoneVerificationStatus: "verified",
        phoneVerifiedAt: verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(eq(registrationApplications.id, application.id));

    await recordAuditEvent({
      applicationId: application.id,
      eventType: "PHONE_VERIFIED",
      metadata: { channel: "phone" },
    });
  }

  return { verified: true };
}

export async function resendContactChallenge(options: {
  referenceId: string;
  channel: ContactVerificationChannel;
}): Promise<ContactChannelInitResult> {
  const db = getDb();

  const [application] = await db
    .select({
      id: registrationApplications.id,
      email: registrationApplications.email,
      phone: registrationApplications.phone,
      emailVerificationStatus: registrationApplications.emailVerificationStatus,
      phoneVerificationStatus: registrationApplications.phoneVerificationStatus,
    })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, options.referenceId))
    .limit(1);

  if (!application) {
    // Enumeration-safe generic response
    throw new ContactVerificationError(
      "VERIFICATION_NOT_FOUND",
      "Unable to process verification request.",
    );
  }

  const status =
    options.channel === "email"
      ? application.emailVerificationStatus
      : application.phoneVerificationStatus;

  if (status === "verified") {
    throw new ContactVerificationError(
      "VERIFICATION_ALREADY_VERIFIED",
      "This contact channel is already verified.",
    );
  }

  if (status === "skipped") {
    throw new ContactVerificationError(
      "VERIFICATION_NOT_CONFIGURED",
      "Contact verification is not enabled for this channel.",
    );
  }

  let result: ContactChannelInitResult;
  try {
    result = await createAndDeliverChallenge({
      applicationId: application.id,
      referenceId: options.referenceId,
      channel: options.channel,
      email: application.email,
      phone: application.phone,
      supersedePrevious: true,
    });
  } catch (error) {
    if (error instanceof ContactVerificationError) {
      throw error;
    }
    throw new ContactVerificationError(
      "PROVIDER_UNAVAILABLE",
      "Unable to send verification code.",
    );
  }

  if (result.status === "unavailable") {
    throw new ContactVerificationError(
      "PROVIDER_UNAVAILABLE",
      "Verification provider is unavailable.",
    );
  }

  if (result.status === "pending") {
    await db
      .update(registrationApplications)
      .set({
        ...(options.channel === "email"
          ? { emailVerificationStatus: "pending" as const }
          : { phoneVerificationStatus: "pending" as const }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(registrationApplications.id, application.id));
  }

  return result;
}

export function getCooldownRemainingMs(createdAt: string): number {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, VERIFICATION_RESEND_COOLDOWN_MS - elapsed);
}
