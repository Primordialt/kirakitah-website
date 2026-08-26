import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { participantAccounts, participantProfiles } from "@/server/db/schema";
import type { ApiErrorCode } from "@/server/errors";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import {
  hashParticipantPassword,
  validateParticipantPassword,
} from "@/server/participant/auth/password";
import {
  assertUsernameAvailable,
  normalizeUsername,
  UsernameConflictError,
  validateUsername,
} from "@/server/participant/auth/username";
import {
  assertPreRegistrationEmailVerified,
  consumePreRegistrationEmailVerification,
  normalizeRegistrationEmail,
  PreRegistrationEmailError,
} from "@/server/verification/email/pre-registration";

export class ParticipantRegisterError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ParticipantRegisterError";
    this.code = code;
  }
}

const ACCOUNT_EXISTS_MESSAGE =
  "An account already exists for this email. Please log in.";

export async function createParticipantAccount(input: {
  email: string;
  emailVerificationToken: string;
  username: string;
  password: string;
}): Promise<{ accountId: string; username: string; email: string }> {
  const emailNormalized = normalizeRegistrationEmail(input.email);
  const usernameError = validateUsername(input.username);
  if (usernameError) {
    throw new ParticipantRegisterError("VALIDATION_ERROR", usernameError);
  }

  const passwordError = validateParticipantPassword(input.password);
  if (passwordError) {
    throw new ParticipantRegisterError("VALIDATION_ERROR", passwordError);
  }

  const db = getDb();
  const [existingEmail] = await db
    .select({ id: participantAccounts.id })
    .from(participantAccounts)
    .where(eq(participantAccounts.emailNormalized, emailNormalized))
    .limit(1);

  if (existingEmail) {
    throw new ParticipantRegisterError("ACCOUNT_EXISTS", ACCOUNT_EXISTS_MESSAGE);
  }

  let emailProof: { challengeId: string; verifiedAt: string };
  try {
    emailProof = await assertPreRegistrationEmailVerified({
      email: emailNormalized,
      emailVerificationToken: input.emailVerificationToken,
    });
  } catch (error) {
    if (error instanceof PreRegistrationEmailError) {
      throw new ParticipantRegisterError(error.code, error.message);
    }
    throw error;
  }

  try {
    await assertUsernameAvailable(input.username);
  } catch (error) {
    if (error instanceof UsernameConflictError) {
      throw new ParticipantRegisterError(error.code, error.message);
    }
    throw error;
  }

  const passwordHash = await hashParticipantPassword(input.password);
  const username = input.username.trim();
  const usernameNormalized = normalizeUsername(username);
  const now = new Date().toISOString();

  try {
    const [account] = await db
      .insert(participantAccounts)
      .values({
        email: emailNormalized,
        emailNormalized,
        username,
        usernameNormalized,
        passwordHash,
        emailVerifiedAt: emailProof.verifiedAt,
        active: true,
        updatedAt: now,
      })
      .returning({
        id: participantAccounts.id,
        email: participantAccounts.email,
        username: participantAccounts.username,
      });

    await db.insert(participantProfiles).values({
      accountId: account.id,
      status: "incomplete",
      completionPercent: 0,
      updatedAt: now,
    });

    await consumePreRegistrationEmailVerification(emailProof.challengeId);

    await recordParticipantAuditEvent({
      eventType: "PARTICIPANT_ACCOUNT_CREATED",
      accountId: account.id,
      actor: account.id,
      metadata: { source: "register" },
    });

    await recordParticipantAuditEvent({
      eventType: "PARTICIPANT_EMAIL_VERIFIED",
      accountId: account.id,
      actor: account.id,
      metadata: { source: "pre_registration" },
    });

    return {
      accountId: account.id,
      username: account.username,
      email: account.email,
    };
  } catch (error) {
    if (error instanceof UsernameConflictError) {
      throw new ParticipantRegisterError(error.code, error.message);
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "";
      if (message.includes("username")) {
        throw new ParticipantRegisterError(
          "DUPLICATE_USERNAME",
          "That username is already taken.",
        );
      }
      throw new ParticipantRegisterError("ACCOUNT_EXISTS", ACCOUNT_EXISTS_MESSAGE);
    }
    throw error;
  }
}

export async function participantAccountExistsForEmail(
  email: string,
): Promise<boolean> {
  const emailNormalized = normalizeRegistrationEmail(email);
  const db = getDb();
  const [hit] = await db
    .select({ id: participantAccounts.id })
    .from(participantAccounts)
    .where(eq(participantAccounts.emailNormalized, emailNormalized))
    .limit(1);
  return Boolean(hit);
}

export { ACCOUNT_EXISTS_MESSAGE };
