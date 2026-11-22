import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { participantAccounts, participantProfiles } from "@/server/db/schema";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import { hashParticipantPassword } from "@/server/participant/auth/password";
import {
  setParticipantSessionCookie,
  type ParticipantSessionUser,
} from "@/server/participant/auth/session";
import {
  normalizeUsername,
  validateUsername,
} from "@/server/participant/auth/username";
import { normalizeRegistrationEmail } from "@/server/verification/email/pre-registration";

export type SocialProvider = "google" | "apple";

export function providerEmailIsVerified(emailVerified: unknown): boolean {
  return emailVerified === true;
}

export function socialProviderFromSubject(
  subject: string | undefined,
): SocialProvider | null {
  if (!subject) return null;
  if (subject.startsWith("google-oauth2|")) return "google";
  if (subject.startsWith("apple|")) return "apple";
  return null;
}

export function usernameBaseFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  let base = local.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16);
  if (base.length < 3) base = `player${base}`.slice(0, 16);
  if (validateUsername(base)) {
    base = `player${base}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16);
  }
  if (base.length < 3) return "player";
  return base;
}

async function unusedUsername(base: string): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = attempt === 0 ? "" : String(attempt + 1);
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    if (validateUsername(candidate)) continue;
    const [hit] = await db
      .select({ id: participantAccounts.id })
      .from(participantAccounts)
      .where(
        eq(participantAccounts.usernameNormalized, normalizeUsername(candidate)),
      )
      .limit(1);
    if (!hit) return candidate;
  }

  const fallback = `${base.slice(0, 16)}${randomBytes(3).toString("hex")}`;
  return fallback.slice(0, 24);
}

export async function createSocialParticipantAccount(input: {
  email: string;
  provider: SocialProvider;
}): Promise<ParticipantSessionUser> {
  const emailNormalized = normalizeRegistrationEmail(input.email);
  const username = await unusedUsername(usernameBaseFromEmail(emailNormalized));
  const passwordHash = await hashParticipantPassword(
    randomBytes(32).toString("base64url"),
  );
  const now = new Date().toISOString();
  const db = getDb();

  const [account] = await db
    .insert(participantAccounts)
    .values({
      email: emailNormalized,
      emailNormalized,
      username,
      usernameNormalized: normalizeUsername(username),
      passwordHash,
      emailVerifiedAt: now,
      active: true,
      updatedAt: now,
    })
    .returning({
      id: participantAccounts.id,
      email: participantAccounts.email,
      username: participantAccounts.username,
      active: participantAccounts.active,
    });

  await db.insert(participantProfiles).values({
    accountId: account.id,
    status: "incomplete",
    completionPercent: 0,
    updatedAt: now,
  });

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_ACCOUNT_CREATED",
    accountId: account.id,
    actor: account.id,
    metadata: { source: input.provider },
  });

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_EMAIL_VERIFIED",
    accountId: account.id,
    actor: account.id,
    metadata: { source: input.provider },
  });

  return account;
}

export async function startSocialParticipantSession(
  user: ParticipantSessionUser,
  provider: SocialProvider,
): Promise<void> {
  const db = getDb();
  await db
    .update(participantAccounts)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(participantAccounts.id, user.id));

  await setParticipantSessionCookie(user);
  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_LOGIN_SUCCESS",
    accountId: user.id,
    actor: user.id,
    metadata: { method: provider },
  }).catch(() => undefined);
}
