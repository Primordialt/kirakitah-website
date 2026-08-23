import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/server/env";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import type { AdminSession, AdminUser } from "@/server/admin/auth/types";
import {
  AdminAuthenticationError,
} from "@/server/admin/authorization/permissions";
import { ADMIN_SESSION_COOKIE } from "@/server/admin/auth/constants";

export { ADMIN_SESSION_COOKIE };

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface SessionPayload {
  sub: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret =
    serverEnv.adminSessionSecret ?? serverEnv.registrationPiiEncryptionKey;
  if (!secret) {
    throw new AdminAuthenticationError("Admin session secret is not configured.");
  }
  return secret;
}

function sign(payloadBase64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function createSessionToken(user: AdminUser, now = Date.now()): string {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(payloadBase64, getSessionSecret());
  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string): AdminSession | null {
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

  try {
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.active) return null;
    if (payload.exp < Date.now()) return null;

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
        role: payload.role,
        active: payload.active,
      },
      issuedAt: new Date(payload.iat).toISOString(),
      expiresAt: new Date(payload.exp).toISOString(),
    };
  } catch {
    return null;
  }
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

export async function setAdminSessionCookie(user: AdminUser): Promise<string> {
  const token = createSessionToken(user);
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions());
  return token;
}

export async function clearAdminSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getAdminSessionFromRequest(request: Request): AdminSession | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(ADMIN_SESSION_COOKIE.length + 1));
  return verifySessionToken(token);
}

export function requireAdminSession(session: AdminSession | null): AdminSession {
  if (!session?.user.active) {
    throw new AdminAuthenticationError();
  }
  return session;
}
