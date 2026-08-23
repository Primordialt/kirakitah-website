import { randomUUID } from "crypto";
import { serverEnv } from "@/server/env";
import {
  ADMIN_ROLES,
  type AdminRole,
} from "@/server/admin/authorization/permissions";
import type { AdminAuthProvider, AdminLoginCredentials, AdminUser } from "./types";

/**
 * Development / test admin authentication only.
 * MUST NOT operate in production.
 */
export class MockAdminAuthProvider implements AdminAuthProvider {
  readonly providerId = "mock";

  async authenticate(credentials: AdminLoginCredentials): Promise<AdminUser> {
    if (serverEnv.isProduction) {
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
 * Production placeholder until a real identity provider is configured.
 * Always fails closed.
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
 * Future HTTP/OIDC provider stub — PENDING PROVIDER.
 * Fails closed until credentials exist.
 */
export class HttpAdminAuthProvider implements AdminAuthProvider {
  readonly providerId = "http";

  async authenticate(): Promise<AdminUser> {
    if (!serverEnv.adminAuthApiUrl || !serverEnv.adminAuthApiKey) {
      throw new Error("Admin authentication provider credentials are missing.");
    }
    // Real OIDC/SSO integration is PENDING PROVIDER.
    throw new Error("HTTP admin authentication is not yet enabled.");
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

  if (mode === "http") {
    return new HttpAdminAuthProvider();
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
