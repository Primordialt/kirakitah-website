import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/server/db";
import { participantAccounts, participantSessions } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { PARTICIPANT_SESSION_COOKIE } from "@/server/participant/auth/constants";

export { PARTICIPANT_SESSION_COOKIE };

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export class ParticipantAuthenticationError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "ParticipantAuthenticationError";
  }
}

export interface ParticipantSessionUser {
  id: string;
  email: string;
  username: string;
  active: boolean;
}

export interface ParticipantSession {
  user: ParticipantSessionUser;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
}

interface SessionPayload {
  sid: string;
  sub: string;
  email: string;
  username: string;
  active: boolean;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret =
    serverEnv.participantSessionSecret ??
    serverEnv.registrationPiiEncryptionKey;
  if (!secret) {
    throw new ParticipantAuthenticationError(
      "Participant session secret is not configured.",
    );
  }
  return secret;
}

function sign(payloadBase64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

function hashSessionToken(token: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: serverEnv.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createParticipantSession(
  user: ParticipantSessionUser,
  now = Date.now(),
): Promise<string> {
  const secret = getSessionSecret();
  const sessionId = randomUUID();
  const exp = now + SESSION_TTL_MS;

  const payload: SessionPayload = {
    sid: sessionId,
    sub: user.id,
    email: user.email,
    username: user.username,
    active: user.active,
    iat: now,
    exp,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(payloadBase64, secret);
  const token = `${payloadBase64}.${signature}`;
  const tokenHash = hashSessionToken(token, secret);

  const db = getDb();
  await db.insert(participantSessions).values({
    id: sessionId,
    accountId: user.id,
    tokenHash,
    expiresAt: new Date(exp).toISOString(),
  });

  return token;
}

export async function verifyParticipantSessionToken(
  token: string,
): Promise<ParticipantSession | null> {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const expected = sign(payloadBase64, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload.active || !payload.sid || !payload.sub) return null;
  if (payload.exp < Date.now()) return null;

  const tokenHash = hashSessionToken(token, secret);
  const db = getDb();
  const [row] = await db
    .select()
    .from(participantSessions)
    .where(
      and(
        eq(participantSessions.id, payload.sid),
        eq(participantSessions.tokenHash, tokenHash),
        isNull(participantSessions.revokedAt),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (Date.parse(row.expiresAt) <= Date.now()) return null;

  const [account] = await db
    .select({
      id: participantAccounts.id,
      email: participantAccounts.email,
      username: participantAccounts.username,
      active: participantAccounts.active,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, payload.sub))
    .limit(1);

  if (!account?.active) return null;

  return {
    user: {
      id: account.id,
      email: account.email,
      username: account.username,
      active: account.active,
    },
    sessionId: row.id,
    issuedAt: new Date(payload.iat).toISOString(),
    expiresAt: row.expiresAt,
  };
}

export async function setParticipantSessionCookie(
  user: ParticipantSessionUser,
): Promise<string> {
  const token = await createParticipantSession(user);
  const jar = await cookies();
  jar.set(PARTICIPANT_SESSION_COOKIE, token, sessionCookieOptions());
  return token;
}

export async function clearParticipantSessionCookie(
  token?: string | null,
): Promise<void> {
  if (token) {
    await revokeParticipantSessionToken(token).catch(() => undefined);
  }

  const jar = await cookies();
  jar.set(PARTICIPANT_SESSION_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export async function revokeParticipantSessionToken(
  token: string,
): Promise<void> {
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return;
  }

  const tokenHash = hashSessionToken(token, secret);
  const db = getDb();
  await db
    .update(participantSessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(
        eq(participantSessions.tokenHash, tokenHash),
        isNull(participantSessions.revokedAt),
      ),
    );
}

export async function getParticipantSessionFromCookies(): Promise<ParticipantSession | null> {
  const jar = await cookies();
  const token = jar.get(PARTICIPANT_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyParticipantSessionToken(token);
}

export function getParticipantSessionTokenFromRequest(
  request: Request,
): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PARTICIPANT_SESSION_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(PARTICIPANT_SESSION_COOKIE.length + 1));
}

export async function getParticipantSessionFromRequest(
  request: Request,
): Promise<ParticipantSession | null> {
  const token = getParticipantSessionTokenFromRequest(request);
  if (!token) return null;
  return verifyParticipantSessionToken(token);
}

export function requireParticipantSession(
  session: ParticipantSession | null,
): ParticipantSession {
  if (!session?.user.active) {
    throw new ParticipantAuthenticationError();
  }
  return session;
}

export async function requireParticipantApiSession(
  request: Request,
): Promise<ParticipantSession> {
  return requireParticipantSession(
    await getParticipantSessionFromRequest(request),
  );
}

/**
 * CSRF protection for cookie-authenticated participant mutations.
 */
export function assertParticipantCsrf(request: Request): void {
  if (request.method === "GET" || request.method === "HEAD") {
    return;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const requestHost = new URL(request.url).host;

  if (origin) {
    try {
      if (new URL(origin).host === requestHost) return;
    } catch {
      // fall through
    }
  }

  if (referer) {
    try {
      if (new URL(referer).host === requestHost) return;
    } catch {
      // fall through
    }
  }

  throw new ParticipantAuthenticationError("CSRF validation failed.");
}
