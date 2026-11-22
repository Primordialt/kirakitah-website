import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth0 } from "@/lib/auth0";
import { ADMIN_SESSION_COOKIE } from "@/server/admin/auth/constants";
import { PARTICIPANT_SESSION_COOKIE } from "@/server/participant/auth/constants";

function isProductionLikeEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

function hasAdminSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function hasParticipantSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(PARTICIPANT_SESSION_COOKIE)?.value);
}

function isPublicParticipantAuthPath(pathname: string): boolean {
  return (
    pathname === "/api/participant/auth/login" ||
    pathname === "/api/participant/auth/register" ||
    pathname === "/api/participant/auth/forgot-password" ||
    pathname === "/api/participant/auth/reset-password" ||
    pathname.startsWith("/api/participant/auth/email/")
  );
}

function dropUnsafeLogoutReturn(request: NextRequest): void {
  if (request.nextUrl.pathname !== "/auth/logout") return;
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  if (returnTo === null) return;
  try {
    const target = new URL(returnTo, request.nextUrl.origin);
    if (target.origin !== request.nextUrl.origin) {
      request.nextUrl.searchParams.delete("returnTo");
    }
  } catch {
    request.nextUrl.searchParams.delete("returnTo");
  }
}

function applyAuthCookies(
  response: NextResponse,
  authRes: NextResponse | null,
): NextResponse {
  if (!authRes) return response;
  for (const cookie of authRes.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

/**
 * Edge middleware:
 * - mounts Auth0 /auth/* when configured
 * - blocks /dev in production-like environments
 * - redirects unauthenticated /admin page traffic to /admin/login
 * - rejects unauthenticated /api/admin traffic (except login)
 * - protects participant dashboard/profile/tournaments pages and /api/participant
 *
 * Full session signature verification happens in Node route handlers / RSC.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dev") && isProductionLikeEnvironment()) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const auth0 = getAuth0();
  if (pathname.startsWith("/auth") && !auth0) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let authRes: NextResponse | null = null;
  if (auth0) {
    dropUnsafeLogoutReturn(request);
    authRes = await auth0.middleware(request);
    if (pathname.startsWith("/auth")) return authRes;
    if (authRes.status >= 300 && authRes.status < 400) return authRes;
  }

  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");
  const isLoginApi = pathname === "/api/admin/auth/login";
  const isLoginPage = pathname === "/admin/login";

  if (isAdminApi && !isLoginApi && !hasAdminSessionCookie(request)) {
    return applyAuthCookies(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "X-Robots-Tag": "noindex, nofollow",
          },
        },
      ),
      authRes,
    );
  }

  if (isAdminPage && !isLoginPage && !hasAdminSessionCookie(request)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applyAuthCookies(NextResponse.redirect(loginUrl), authRes);
  }

  if (isAdminPage || isAdminApi) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    return applyAuthCookies(response, authRes);
  }

  const isParticipantApi = pathname.startsWith("/api/participant");
  const isParticipantProtectedPage =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/matches" ||
    pathname.startsWith("/matches/") ||
    pathname === "/arena" ||
    pathname.startsWith("/arena/") ||
    pathname === "/wallet" ||
    pathname.startsWith("/wallet/") ||
    pathname === "/chatbox" ||
    pathname.startsWith("/chatbox/") ||
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/tournaments" ||
    pathname.startsWith("/tournaments/");

  if (
    isParticipantApi &&
    !isPublicParticipantAuthPath(pathname) &&
    !hasParticipantSessionCookie(request)
  ) {
    return applyAuthCookies(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
          },
        },
      ),
      authRes,
    );
  }

  if (isParticipantProtectedPage && !hasParticipantSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applyAuthCookies(NextResponse.redirect(loginUrl), authRes);
  }

  return applyAuthCookies(NextResponse.next(), authRes);
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/dev/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/dashboard",
    "/profile/:path*",
    "/profile",
    "/account/:path*",
    "/account",
    "/matches/:path*",
    "/matches",
    "/arena/:path*",
    "/arena",
    "/wallet/:path*",
    "/wallet",
    "/chatbox/:path*",
    "/chatbox",
    "/notifications/:path*",
    "/notifications",
    "/tournaments/:path*",
    "/tournaments",
    "/api/participant/:path*",
  ],
};
