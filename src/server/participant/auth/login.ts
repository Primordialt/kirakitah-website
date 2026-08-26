import { and, eq, gte, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { getDb } from "@/server/db";
import {
  participantAccounts,
  participantLoginAttempts,
} from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import type { ApiErrorCode } from "@/server/errors";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import { verifyParticipantPassword } from "@/server/participant/auth/password";
import {
  setParticipantSessionCookie,
  type ParticipantSessionUser,
} from "@/server/participant/auth/session";
import { normalizeUsername } from "@/server/participant/auth/username";
import { normalizeRegistrationEmail } from "@/server/verification/email/pre-registration";

export class ParticipantLoginError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ParticipantLoginError";
    this.code = code;
  }
}

const LOGIN_IP_MAX_PER_HOUR = 20;
const LOGIN_IDENTIFIER_MAX_PER_HOUR = 10;
const LOGIN_LOCK_THRESHOLD = 8;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email/username or password.";

function hashAttemptValue(value: string): string {
  const pepper =
    serverEnv.participantSessionSecret ??
    serverEnv.registrationPiiEncryptionKey ??
    "kirakitah-participant-login";
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex");
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

export async function loginParticipant(input: {
  identifier: string;
  password: string;
  clientIp?: string | null;
}): Promise<ParticipantSessionUser> {
  const identifierRaw = input.identifier.trim();
  if (!identifierRaw || !input.password) {
    throw new ParticipantLoginError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
  }

  const looksLikeEmail = identifierRaw.includes("@");
  const identifierKey = looksLikeEmail
    ? `email:${hashAttemptValue(normalizeRegistrationEmail(identifierRaw))}`
    : `username:${hashAttemptValue(normalizeUsername(identifierRaw))}`;
  const ipKey = input.clientIp
    ? `ip:${hashAttemptValue(input.clientIp)}`
    : null;
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const identifierAttempts = await countRecentAttempts(
    identifierKey,
    windowStart,
  );
  if (identifierAttempts >= LOGIN_IDENTIFIER_MAX_PER_HOUR) {
    throw new ParticipantLoginError(
      "RATE_LIMITED",
      "Too many sign-in attempts. Please try again later.",
    );
  }

  if (ipKey) {
    const ipAttempts = await countRecentAttempts(ipKey, windowStart);
    if (ipAttempts >= LOGIN_IP_MAX_PER_HOUR) {
      throw new ParticipantLoginError(
        "RATE_LIMITED",
        "Too many sign-in attempts. Please try again later.",
      );
    }
  }

  const db = getDb();
  const emailNormalized = looksLikeEmail
    ? normalizeRegistrationEmail(identifierRaw)
    : null;
  const usernameNormalized = looksLikeEmail
    ? null
    : normalizeUsername(identifierRaw);

  const [row] = await db
    .select()
    .from(participantAccounts)
    .where(
      looksLikeEmail
        ? eq(participantAccounts.emailNormalized, emailNormalized!)
        : eq(participantAccounts.usernameNormalized, usernameNormalized!),
    )
    .limit(1);

  const reject = async () => {
    await recordAttempt(identifierKey);
    if (ipKey) await recordAttempt(ipKey);

    if (row?.id) {
      const nextFailures = (row.failedLoginAttempts ?? 0) + 1;
      const lockedUntil =
        nextFailures >= LOGIN_LOCK_THRESHOLD
          ? new Date(Date.now() + LOGIN_LOCK_MS).toISOString()
          : row.lockedUntil;

      await db
        .update(participantAccounts)
        .set({
          failedLoginAttempts: nextFailures,
          lockedUntil: lockedUntil ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(participantAccounts.id, row.id));
    }

    await recordParticipantAuditEvent({
      eventType: "PARTICIPANT_LOGIN_FAILURE",
      accountId: row?.id,
      metadata: { reason: "INVALID_CREDENTIALS" },
    }).catch(() => undefined);

    throw new ParticipantLoginError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
  };

  if (!row || !row.active || !row.passwordHash) {
    await reject();
    throw new ParticipantLoginError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
  }

  if (row.lockedUntil && Date.parse(row.lockedUntil) > Date.now()) {
    await recordAttempt(identifierKey);
    if (ipKey) await recordAttempt(ipKey);
    await recordParticipantAuditEvent({
      eventType: "PARTICIPANT_LOGIN_FAILURE",
      accountId: row.id,
      metadata: { reason: "LOCKED" },
    }).catch(() => undefined);
    throw new ParticipantLoginError(
      "RATE_LIMITED",
      "Too many sign-in attempts. Please try again later.",
    );
  }

  const valid = await verifyParticipantPassword(
    input.password,
    row.passwordHash,
  );
  if (!valid) {
    await reject();
    throw new ParticipantLoginError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
  }

  const now = new Date().toISOString();
  await db
    .update(participantAccounts)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    .where(eq(participantAccounts.id, row.id));

  const user: ParticipantSessionUser = {
    id: row.id,
    email: row.email,
    username: row.username,
    active: row.active,
  };

  await setParticipantSessionCookie(user);

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_LOGIN_SUCCESS",
    accountId: user.id,
    actor: user.id,
  });

  return user;
}
