import { and, eq, gte, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { getDb } from "@/server/db";
import { adminLoginAttempts, adminUsers } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import type { AdminAuthProvider, AdminLoginCredentials, AdminUser } from "./types";
import { verifyAdminPassword } from "./password";

export class AdminAuthError extends Error {
  readonly code: "INVALID_CREDENTIALS" | "RATE_LIMITED";

  constructor(code: "INVALID_CREDENTIALS" | "RATE_LIMITED", message: string) {
    super(message);
    this.name = "AdminAuthError";
    this.code = code;
  }
}

/** Max failed attempts per IP hash in one hour. */
export const ADMIN_LOGIN_IP_MAX_PER_HOUR = 20;
/** Max failed attempts per email hash in one hour. */
export const ADMIN_LOGIN_EMAIL_MAX_PER_HOUR = 10;
/** Account lock after consecutive failures. */
export const ADMIN_LOGIN_LOCK_THRESHOLD = 8;
export const ADMIN_LOGIN_LOCK_MS = 15 * 60 * 1000;

function hashAttemptValue(value: string): string {
  const pepper =
    serverEnv.adminSessionSecret ??
    serverEnv.registrationPiiEncryptionKey ??
    "kirakitah-admin-login";
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex");
}

async function countRecentAttempts(attemptKey: string, sinceIso: string) {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminLoginAttempts)
    .where(
      and(
        eq(adminLoginAttempts.attemptKey, attemptKey),
        gte(adminLoginAttempts.createdAt, sinceIso),
      ),
    );
  return rows[0]?.count ?? 0;
}

async function recordAttempt(attemptKey: string) {
  const db = getDb();
  await db.insert(adminLoginAttempts).values({ attemptKey });
}

/**
 * Database-backed admin password authentication for Production.
 * Never reveals whether the email exists.
 */
export class DatabaseAdminAuthProvider implements AdminAuthProvider {
  readonly providerId = "database";

  async authenticate(credentials: AdminLoginCredentials): Promise<AdminUser> {
    if (!credentials.password) {
      throw new AdminAuthError(
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    const email = credentials.email.trim().toLowerCase();
    const emailKey = `email:${hashAttemptValue(email)}`;
    const ipKey = credentials.clientIp
      ? `ip:${hashAttemptValue(credentials.clientIp)}`
      : null;
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const emailAttempts = await countRecentAttempts(emailKey, windowStart);
    if (emailAttempts >= ADMIN_LOGIN_EMAIL_MAX_PER_HOUR) {
      throw new AdminAuthError(
        "RATE_LIMITED",
        "Too many sign-in attempts. Please try again later.",
      );
    }

    if (ipKey) {
      const ipAttempts = await countRecentAttempts(ipKey, windowStart);
      if (ipAttempts >= ADMIN_LOGIN_IP_MAX_PER_HOUR) {
        throw new AdminAuthError(
          "RATE_LIMITED",
          "Too many sign-in attempts. Please try again later.",
        );
      }
    }

    const db = getDb();
    const [row] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    const reject = async () => {
      await recordAttempt(emailKey);
      if (ipKey) await recordAttempt(ipKey);

      if (row?.id) {
        const nextFailures = (row.failedLoginAttempts ?? 0) + 1;
        const lockedUntil =
          nextFailures >= ADMIN_LOGIN_LOCK_THRESHOLD
            ? new Date(Date.now() + ADMIN_LOGIN_LOCK_MS).toISOString()
            : row.lockedUntil;

        await db
          .update(adminUsers)
          .set({
            failedLoginAttempts: nextFailures,
            lockedUntil: lockedUntil ?? null,
          })
          .where(eq(adminUsers.id, row.id));
      }

      throw new AdminAuthError(
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    };

    if (!row || !row.active || !row.passwordHash) {
      await reject();
      throw new AdminAuthError(
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    if (row.lockedUntil && Date.parse(row.lockedUntil) > Date.now()) {
      await recordAttempt(emailKey);
      if (ipKey) await recordAttempt(ipKey);
      throw new AdminAuthError(
        "RATE_LIMITED",
        "Too many sign-in attempts. Please try again later.",
      );
    }

    const passwordHash = row.passwordHash;
    const valid = await verifyAdminPassword(credentials.password, passwordHash);
    if (!valid) {
      await reject();
      throw new AdminAuthError(
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    const now = new Date().toISOString();
    await db
      .update(adminUsers)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
      })
      .where(eq(adminUsers.id, row.id));

    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      active: row.active,
    };
  }
}
