import { randomBytes, randomInt } from "crypto";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { COMPETITION_NAME } from "@/config/competition";
import { getDb } from "@/server/db";
import {
  preRegistrationEmailChallenges,
  registrationApplications,
} from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import type { ApiErrorCode } from "@/server/errors";
import { hashSensitiveValue } from "@/server/registration/pii";
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

const ACTIVE_APPLICATION_STATUSES = [
  "received",
  "under_review",
  "verified",
] as const;

const DUPLICATE_EMAIL_MESSAGE = `This email address is already registered for ${COMPETITION_NAME}.`;

export class PreRegistrationEmailError extends Error {
  readonly code: ApiErrorCode;
  readonly resendAvailableAt?: string;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { resendAvailableAt?: string },
  ) {
    super(message);
    this.name = "PreRegistrationEmailError";
    this.code = code;
    this.resendAvailableAt = options?.resendAvailableAt;
  }
}

export function normalizeRegistrationEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requirePepper(): string {
  const key = serverEnv.registrationPiiEncryptionKey;
  if (!key) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_NOT_CONFIGURED",
      "Verification security configuration is incomplete.",
    );
  }
  return key;
}

async function assertNotAlreadyRegistered(
  emailNormalized: string,
  eventId: string,
): Promise<void> {
  const db = getDb();
  const [hit] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        inArray(registrationApplications.status, [...ACTIVE_APPLICATION_STATUSES]),
        sql`lower(${registrationApplications.email}) = ${emailNormalized}`,
      ),
    )
    .limit(1);

  if (hit) {
    throw new PreRegistrationEmailError("DUPLICATE_EMAIL", DUPLICATE_EMAIL_MESSAGE);
  }
}

async function assertChallengeRateLimits(emailHash: string): Promise<void> {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const recent = await db
    .select({ id: preRegistrationEmailChallenges.id })
    .from(preRegistrationEmailChallenges)
    .where(
      and(
        eq(preRegistrationEmailChallenges.emailHash, emailHash),
        gte(preRegistrationEmailChallenges.createdAt, oneHourAgo),
      ),
    )
    .limit(VERIFICATION_RESEND_MAX_PER_HOUR + 1);

  if (recent.length >= VERIFICATION_RESEND_MAX_PER_HOUR) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_RATE_LIMITED",
      "Too many verification requests. Please try again later.",
    );
  }

  const recentAttempts = await db
    .select({ attempts: preRegistrationEmailChallenges.attempts })
    .from(preRegistrationEmailChallenges)
    .where(
      and(
        eq(preRegistrationEmailChallenges.emailHash, emailHash),
        gte(preRegistrationEmailChallenges.createdAt, oneHourAgo),
      ),
    );

  const totalAttempts = recentAttempts.reduce((sum, row) => sum + row.attempts, 0);
  if (totalAttempts >= VERIFICATION_ATTEMPT_MAX_PER_HOUR) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_RATE_LIMITED",
      "Too many verification attempts. Please try again later.",
    );
  }
}

/**
 * Create + deliver a pre-registration email OTP challenge.
 * Does not create an application. Does not permanently reserve the email.
 */
export async function initiatePreRegistrationEmailChallenge(input: {
  email: string;
  eventId: string;
  recipientFirstName?: string;
}): Promise<{
  challengeId: string;
  resendAvailableAt: string;
  provider: string;
}> {
  const pepper = requirePepper();
  const emailNormalized = normalizeRegistrationEmail(input.email);
  if (!emailNormalized || !emailNormalized.includes("@")) {
    throw new PreRegistrationEmailError(
      "VALIDATION_ERROR",
      "Enter a valid email address.",
    );
  }

  await assertNotAlreadyRegistered(emailNormalized, input.eventId);

  const emailHash = hashSensitiveValue(emailNormalized, pepper);
  await assertChallengeRateLimits(emailHash);

  const db = getDb();
  const [latest] = await db
    .select()
    .from(preRegistrationEmailChallenges)
    .where(eq(preRegistrationEmailChallenges.emailNormalized, emailNormalized))
    .orderBy(desc(preRegistrationEmailChallenges.createdAt))
    .limit(1);

  if (latest && !latest.verifiedAt && !latest.supersededAt) {
    const ageMs = Date.now() - new Date(latest.createdAt).getTime();
    if (ageMs < VERIFICATION_RESEND_COOLDOWN_MS) {
      const resendAvailableAt = new Date(
        new Date(latest.createdAt).getTime() + VERIFICATION_RESEND_COOLDOWN_MS,
      ).toISOString();
      throw new PreRegistrationEmailError(
        "VERIFICATION_COOLDOWN",
        "Please wait before requesting another verification code.",
        { resendAvailableAt },
      );
    }
  }

  const providers = getVerificationProviders();
  if (
    providers.email.providerId === "unavailable" ||
    providers.email.providerId === "none"
  ) {
    throw new PreRegistrationEmailError(
      "PROVIDER_UNAVAILABLE",
      "Verification messaging is temporarily unavailable.",
    );
  }

  const code = randomInt(VERIFICATION_OTP_MIN, VERIFICATION_OTP_MAX).toString();
  const expiresAt = new Date(Date.now() + VERIFICATION_CHALLENGE_TTL_MS).toISOString();

  const delivery = await providers.email.sendVerificationEmail({
    email: emailNormalized,
    referenceId: "pre-registration",
    code,
    expiresInMinutes: VERIFICATION_CHALLENGE_TTL_MINUTES,
    recipientFirstName: input.recipientFirstName,
  });

  if (delivery.status !== "sent") {
    throw new PreRegistrationEmailError(
      "PROVIDER_UNAVAILABLE",
      delivery.message ?? "Verification messaging is temporarily unavailable.",
    );
  }

  await db
    .update(preRegistrationEmailChallenges)
    .set({ supersededAt: new Date().toISOString() })
    .where(
      and(
        eq(preRegistrationEmailChallenges.emailNormalized, emailNormalized),
        isNull(preRegistrationEmailChallenges.supersededAt),
        isNull(preRegistrationEmailChallenges.consumedAt),
      ),
    );

  const [challenge] = await db
    .insert(preRegistrationEmailChallenges)
    .values({
      emailNormalized,
      emailHash,
      codeHash: hashSensitiveValue(code, pepper),
      maxAttempts: VERIFICATION_MAX_ATTEMPTS,
      expiresAt,
    })
    .returning({
      id: preRegistrationEmailChallenges.id,
      createdAt: preRegistrationEmailChallenges.createdAt,
    });

  return {
    challengeId: challenge.id,
    resendAvailableAt: new Date(
      new Date(challenge.createdAt).getTime() + VERIFICATION_RESEND_COOLDOWN_MS,
    ).toISOString(),
    provider: delivery.provider,
  };
}

/**
 * Verify pre-registration OTP and issue a short-lived opaque proof token.
 */
export async function verifyPreRegistrationEmailChallenge(input: {
  email: string;
  challengeId: string;
  code: string;
}): Promise<{
  emailVerificationToken: string;
  expiresAt: string;
}> {
  const pepper = requirePepper();
  const emailNormalized = normalizeRegistrationEmail(input.email);
  const db = getDb();

  const [challenge] = await db
    .select()
    .from(preRegistrationEmailChallenges)
    .where(eq(preRegistrationEmailChallenges.id, input.challengeId))
    .limit(1);

  if (
    !challenge ||
    challenge.emailNormalized !== emailNormalized ||
    challenge.supersededAt ||
    challenge.consumedAt
  ) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_NOT_FOUND",
      "Unable to process verification request.",
    );
  }

  if (challenge.verifiedAt && challenge.verificationTokenHash) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_ALREADY_VERIFIED",
      "This email is already verified. Continue with your application.",
    );
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_EXPIRED",
      "This code has expired. Request a new one.",
    );
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_EXHAUSTED",
      "Too many attempts. Request a new code.",
    );
  }

  const codeHash = hashSensitiveValue(input.code.trim(), pepper);
  if (codeHash !== challenge.codeHash) {
    await db
      .update(preRegistrationEmailChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(preRegistrationEmailChallenges.id, challenge.id));

    if (challenge.attempts + 1 >= challenge.maxAttempts) {
      throw new PreRegistrationEmailError(
        "VERIFICATION_EXHAUSTED",
        "Too many attempts. Request a new code.",
      );
    }

    throw new PreRegistrationEmailError(
      "VERIFICATION_INVALID",
      "That verification code is incorrect.",
    );
  }

  const token = randomBytes(32).toString("hex");
  const verifiedAt = new Date().toISOString();
  const verificationExpiresAt = new Date(
    Date.now() + VERIFICATION_CHALLENGE_TTL_MS,
  ).toISOString();

  await db
    .update(preRegistrationEmailChallenges)
    .set({
      verifiedAt,
      attempts: challenge.attempts + 1,
      verificationTokenHash: hashSensitiveValue(token, pepper),
      verificationExpiresAt,
    })
    .where(eq(preRegistrationEmailChallenges.id, challenge.id));

  return {
    emailVerificationToken: token,
    expiresAt: verificationExpiresAt,
  };
}

/**
 * Assert a short-lived verification proof for final application submission.
 */
export async function assertPreRegistrationEmailVerified(input: {
  email: string;
  emailVerificationToken: string | undefined;
}): Promise<{ challengeId: string; verifiedAt: string }> {
  if (!input.emailVerificationToken?.trim()) {
    throw new PreRegistrationEmailError(
      "EMAIL_VERIFICATION_REQUIRED",
      "Verify your email address before submitting your application.",
    );
  }

  const pepper = requirePepper();
  const emailNormalized = normalizeRegistrationEmail(input.email);
  const tokenHash = hashSensitiveValue(input.emailVerificationToken.trim(), pepper);
  const db = getDb();

  const [challenge] = await db
    .select()
    .from(preRegistrationEmailChallenges)
    .where(
      and(
        eq(preRegistrationEmailChallenges.verificationTokenHash, tokenHash),
        eq(preRegistrationEmailChallenges.emailNormalized, emailNormalized),
        isNull(preRegistrationEmailChallenges.supersededAt),
        isNull(preRegistrationEmailChallenges.consumedAt),
      ),
    )
    .limit(1);

  if (!challenge?.verifiedAt || !challenge.verificationExpiresAt) {
    throw new PreRegistrationEmailError(
      "EMAIL_VERIFICATION_REQUIRED",
      "Verify your email address before submitting your application.",
    );
  }

  if (new Date(challenge.verificationExpiresAt).getTime() <= Date.now()) {
    throw new PreRegistrationEmailError(
      "VERIFICATION_EXPIRED",
      "Your email verification has expired. Please verify again.",
    );
  }

  return { challengeId: challenge.id, verifiedAt: challenge.verifiedAt };
}

export async function consumePreRegistrationEmailVerification(
  challengeId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(preRegistrationEmailChallenges)
    .set({ consumedAt: new Date().toISOString() })
    .where(
      and(
        eq(preRegistrationEmailChallenges.id, challengeId),
        isNull(preRegistrationEmailChallenges.consumedAt),
      ),
    );
}

export { DUPLICATE_EMAIL_MESSAGE, ACTIVE_APPLICATION_STATUSES };
