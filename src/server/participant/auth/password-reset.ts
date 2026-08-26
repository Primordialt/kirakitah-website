import { createHash, randomBytes } from "crypto";
import { and, eq, gt, gte, isNull, sql } from "drizzle-orm";
import { getSiteUrl } from "@/lib/site-url";
import { getDb } from "@/server/db";
import {
  participantAccounts,
  participantLoginAttempts,
  participantPasswordResetTokens,
} from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import type { ApiErrorCode } from "@/server/errors";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import {
  hashParticipantPassword,
  validateParticipantPassword,
} from "@/server/participant/auth/password";
import { revokeAllParticipantSessionsForAccount } from "@/server/participant/auth/session";
import { hashSensitiveValue } from "@/server/registration/pii";
import { getVerificationProviders } from "@/server/verification";
import { normalizeRegistrationEmail } from "@/server/verification/email/pre-registration";

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "If an account exists for this email, we've sent a password reset link.";

export const PASSWORD_RESET_INVALID_TOKEN_MESSAGE =
  "This reset link is invalid or has expired.";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_TTL_HOURS = 1;
/** Max forgot-password emails per normalized address per hour (active accounts only). */
export const RESET_EMAIL_MAX_PER_HOUR = 5;
/** Max forgot-password requests per client IP per hour. */
export const RESET_IP_MAX_PER_HOUR = 20;
/** 32 bytes → 64 hex chars (256-bit entropy). */
export const PASSWORD_RESET_TOKEN_BYTES = 32;

export class ParticipantPasswordResetError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ParticipantPasswordResetError";
    this.code = code;
  }
}

function requirePiiKey(): string {
  const key = serverEnv.registrationPiiEncryptionKey;
  if (!key) {
    throw new ParticipantPasswordResetError(
      "CONFIGURATION_UNAVAILABLE",
      "Password reset is not configured for this environment.",
    );
  }
  return key;
}

function hashAttemptValue(value: string): string {
  const pepper =
    serverEnv.participantSessionSecret ??
    serverEnv.registrationPiiEncryptionKey ??
    "kirakitah-participant-login";
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex");
}

export function hashPasswordResetToken(rawToken: string, pepper: string): string {
  return hashSensitiveValue(rawToken, pepper);
}

export function isPasswordResetTokenExpired(
  expiresAtIso: string,
  nowMs = Date.now(),
): boolean {
  return Date.parse(expiresAtIso) <= nowMs;
}

export function buildPasswordResetUrl(rawToken: string): string {
  return `${getSiteUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
}

async function countRecentAttempts(keyHash: string, sinceIso: string) {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participantLoginAttempts)
    .where(
      and(
        eq(participantLoginAttempts.keyHash, keyHash),
        gte(participantLoginAttempts.attemptedAt, sinceIso),
      ),
    );
  return rows[0]?.count ?? 0;
}

async function recordAttempt(keyHash: string) {
  const db = getDb();
  await db.insert(participantLoginAttempts).values({ keyHash });
}

/**
 * Enumeration-safe forgot-password request.
 * Always returns the same success message whether or not the email exists.
 * Inactive accounts do not receive email but still get generic success.
 * Never returns or logs the plaintext token.
 *
 * Rate limits:
 * - IP: applied to every request (anti-spam)
 * - Email: applied only when an active account would receive mail (avoids
 *   burning a victim's quota via unknown-address probes)
 */
export async function requestPasswordReset(input: {
  email: string;
  clientIp?: string | null;
}): Promise<{ message: string }> {
  const emailNormalized = normalizeRegistrationEmail(input.email.trim());
  if (!emailNormalized || !emailNormalized.includes("@")) {
    throw new ParticipantPasswordResetError(
      "VALIDATION_ERROR",
      "Enter a valid email address.",
    );
  }

  const ipKey = input.clientIp
    ? `reset:ip:${hashAttemptValue(input.clientIp)}`
    : null;
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  if (ipKey) {
    const ipAttempts = await countRecentAttempts(ipKey, windowStart);
    if (ipAttempts >= RESET_IP_MAX_PER_HOUR) {
      throw new ParticipantPasswordResetError(
        "RATE_LIMITED",
        "Too many password reset requests. Please try again later.",
      );
    }
    await recordAttempt(ipKey);
  }

  const db = getDb();
  const [account] = await db
    .select({
      id: participantAccounts.id,
      email: participantAccounts.email,
      active: participantAccounts.active,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.emailNormalized, emailNormalized))
    .limit(1);

  if (!account || !account.active) {
    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  const emailKey = `reset:email:${hashAttemptValue(emailNormalized)}`;
  const emailAttempts = await countRecentAttempts(emailKey, windowStart);
  if (emailAttempts >= RESET_EMAIL_MAX_PER_HOUR) {
    throw new ParticipantPasswordResetError(
      "RATE_LIMITED",
      "Too many password reset requests. Please try again later.",
    );
  }
  await recordAttempt(emailKey);

  const pepper = requirePiiKey();
  const now = new Date();
  const nowIso = now.toISOString();

  await db
    .update(participantPasswordResetTokens)
    .set({ usedAt: nowIso })
    .where(
      and(
        eq(participantPasswordResetTokens.accountId, account.id),
        isNull(participantPasswordResetTokens.usedAt),
      ),
    );

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken, pepper);
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS).toISOString();

  await db.insert(participantPasswordResetTokens).values({
    accountId: account.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = buildPasswordResetUrl(rawToken);
  const delivery = await getVerificationProviders().email.sendPasswordResetEmail(
    {
      email: account.email,
      resetUrl,
      expiresInHours: RESET_TTL_HOURS,
    },
  );

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_PASSWORD_RESET_REQUESTED",
    accountId: account.id,
    metadata: {
      deliveryStatus: delivery.status,
      provider: delivery.provider,
    },
  }).catch(() => undefined);

  return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
}

/**
 * Complete password reset with a single-use token.
 * Does not auto-login. Revokes all participant sessions for the account.
 * Does not reactivate inactive accounts.
 * Token consumption is atomic (conditional UPDATE) to prevent concurrent reuse.
 */
export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<{ success: true }> {
  const rawToken = input.token.trim();
  if (!rawToken) {
    throw new ParticipantPasswordResetError(
      "VALIDATION_ERROR",
      PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    );
  }

  if (input.password !== input.confirmPassword) {
    throw new ParticipantPasswordResetError(
      "VALIDATION_ERROR",
      "Passwords do not match.",
    );
  }

  const passwordError = validateParticipantPassword(input.password);
  if (passwordError) {
    throw new ParticipantPasswordResetError("VALIDATION_ERROR", passwordError);
  }

  const pepper = requirePiiKey();
  const tokenHash = hashPasswordResetToken(rawToken, pepper);
  const db = getDb();
  const nowIso = new Date().toISOString();

  // Atomic single-use: only one concurrent request can claim the token.
  const [consumed] = await db
    .update(participantPasswordResetTokens)
    .set({ usedAt: nowIso })
    .where(
      and(
        eq(participantPasswordResetTokens.tokenHash, tokenHash),
        isNull(participantPasswordResetTokens.usedAt),
        gt(participantPasswordResetTokens.expiresAt, nowIso),
      ),
    )
    .returning({
      id: participantPasswordResetTokens.id,
      accountId: participantPasswordResetTokens.accountId,
    });

  if (!consumed) {
    throw new ParticipantPasswordResetError(
      "VALIDATION_ERROR",
      PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    );
  }

  const [account] = await db
    .select({
      id: participantAccounts.id,
      active: participantAccounts.active,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, consumed.accountId))
    .limit(1);

  // Token already consumed — inactive accounts cannot regain access via reset.
  if (!account || !account.active) {
    throw new ParticipantPasswordResetError(
      "VALIDATION_ERROR",
      PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    );
  }

  const passwordHash = await hashParticipantPassword(input.password);

  await db
    .update(participantAccounts)
    .set({
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: nowIso,
      // Intentionally do not set active — reset must not reactivate accounts.
    })
    .where(eq(participantAccounts.id, account.id));

  await revokeAllParticipantSessionsForAccount(account.id);

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_PASSWORD_RESET_COMPLETED",
    accountId: account.id,
    actor: account.id,
  }).catch(() => undefined);

  return { success: true };
}
