import { randomUUID } from "crypto";
import { serverEnv } from "@/server/env";
import {
  ADMIN_ROLES,
  type AdminRole,
} from "@/server/admin/authorization/permissions";
import { DatabaseAdminAuthProvider } from "./database-provider";
import type { AdminAuthProvider, AdminLoginCredentials, AdminUser } from "./types";

/**
 * Development / test admin authentication only.
 * MUST NOT operate in production.
 */
export class MockAdminAuthProvider implements AdminAuthProvider {
  readonly providerId = "mock";

  async authenticate(credentials: AdminLoginCredentials): Promise<AdminUser> {
    if (!serverEnv.allowMockAdminAuth) {
      throw new Error("Mock admin authentication cannot operate in production.");
    }

    const email = credentials.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new Error("Invalid admin email.");
    }

    const role: AdminRole =
      credentials.role && ADMIN_ROLES.includes(credentials.role)
        ? credentials.role
        : "REVIEWER";

    return {
      id: `dev-${role.toLowerCase()}`,
      email,
      displayName: `Dev ${role.replace("_", " ")}`,
      role,
      active: true,
    };
  }
}

/**
 * Fail-closed when no usable admin provider is configured.
 */
export class UnavailableAdminAuthProvider implements AdminAuthProvider {
  readonly providerId = "unavailable";

  async authenticate(): Promise<AdminUser> {
    throw new Error(
      "Admin authentication provider is not configured for production.",
    );
  }
}

/**
 * Optional future OIDC/SSO provider stub — not used for password auth.
 * Prefer `database` for KIRAKITAH production admin login.
 */
export class HttpAdminAuthProvider implements AdminAuthProvider {
  readonly providerId = "http";

  async authenticate(): Promise<AdminUser> {
    if (!serverEnv.adminAuthApiUrl || !serverEnv.adminAuthApiKey) {
      throw new Error("Admin authentication provider credentials are missing.");
    }
    throw new Error("HTTP/OIDC admin authentication is not yet enabled.");
  }
}

export function resolveAdminAuthProvider(): AdminAuthProvider {
  const mode = serverEnv.adminAuthProvider;

  if (mode === "mock") {
    if (!serverEnv.allowMockAdminAuth) {
      return new UnavailableAdminAuthProvider();
    }
    return new MockAdminAuthProvider();
  }

  if (mode === "database") {
    if (!serverEnv.databaseUrl) {
      return new UnavailableAdminAuthProvider();
    }
    return new DatabaseAdminAuthProvider();
  }

  if (mode === "http") {
    return new HttpAdminAuthProvider();
  }

  // Default: database in production when DB is configured; mock in development.
  if (serverEnv.isStrictProduction) {
    if (serverEnv.databaseUrl) {
      return new DatabaseAdminAuthProvider();
    }
    return new UnavailableAdminAuthProvider();
  }

  if (serverEnv.allowMockAdminAuth) {
    return new MockAdminAuthProvider();
  }

  return new UnavailableAdminAuthProvider();
}

let cached: AdminAuthProvider | null = null;

export function getAdminAuthProvider(): AdminAuthProvider {
  if (!cached) {
    cached = resolveAdminAuthProvider();
  }
  return cached;
}

export function resetAdminAuthProviderForTests(): void {
  cached = null;
}

/** Stable ID helper for tests */
export function newAdminId(): string {
  return randomUUID();
}
