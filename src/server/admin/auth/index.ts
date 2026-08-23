import { serverEnv } from "@/server/env";
import {
  AdminAuthenticationError,
  assertPermission,
  type AdminPermission,
} from "@/server/admin/authorization/permissions";
import {
  getAdminSessionFromCookies,
  getAdminSessionFromRequest,
  requireAdminSession,
} from "@/server/admin/auth/session";
import type { AdminSession } from "@/server/admin/auth/types";
import { getAdminAuthProvider } from "@/server/admin/auth/providers";

export {
  getAdminAuthProvider,
  resetAdminAuthProviderForTests,
  MockAdminAuthProvider,
} from "@/server/admin/auth/providers";
export {
  createSessionToken,
  verifySessionToken,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  getAdminSessionFromCookies,
  getAdminSessionFromRequest,
  ADMIN_SESSION_COOKIE,
} from "@/server/admin/auth/session";
export { ADMIN_SESSION_COOKIE as ADMIN_SESSION_COOKIE_NAME } from "@/server/admin/auth/constants";
export type { AdminUser, AdminSession, AdminAuthProvider } from "@/server/admin/auth/types";

export async function requireAdminApiSession(
  request: Request,
  permission?: AdminPermission,
): Promise<AdminSession> {
  const session = requireAdminSession(getAdminSessionFromRequest(request));
  if (permission) {
    assertPermission(session.user.role, permission);
  }
  return session;
}

export async function requireAdminPageSession(
  permission?: AdminPermission,
): Promise<AdminSession> {
  const session = requireAdminSession(await getAdminSessionFromCookies());
  if (permission) {
    assertPermission(session.user.role, permission);
  }
  return session;
}

export function assertAdminAuthConfigured(): void {
  const provider = getAdminAuthProvider();
  if (provider.providerId === "unavailable") {
    throw new AdminAuthenticationError(
      "Admin authentication is not configured.",
    );
  }
  if (provider.providerId === "mock" && serverEnv.isStrictProduction) {
    throw new AdminAuthenticationError(
      "Mock admin authentication is disabled in production.",
    );
  }
}

/**
 * CSRF protection for cookie-authenticated state-changing admin requests.
 * Requires matching Origin (or Referer) host against the request URL host.
 */
export function assertAdminCsrf(request: Request): void {
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

  // Same-origin fetch from Next.js server actions may omit Origin in some cases;
  // for API mutations we require Origin or Referer.
  throw new AdminAuthenticationError("CSRF validation failed.");
}
