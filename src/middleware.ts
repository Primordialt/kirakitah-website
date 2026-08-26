import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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

/**
 * Edge middleware:
 * - blocks /dev in production-like environments
 * - redirects unauthenticated /admin page traffic to /admin/login
 * - rejects unauthenticated /api/admin traffic (except login)
 * - protects participant dashboard/profile/tournaments pages and /api/participant
 *
 * Full session signature verification happens in Node route handlers / RSC.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dev") && isProductionLikeEnvironment()) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");
  const isLoginApi = pathname === "/api/admin/auth/login";
  const isLoginPage = pathname === "/admin/login";

  if (isAdminApi && !isLoginApi && !hasAdminSessionCookie(request)) {
    return NextResponse.json(
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
    );
  }

  if (isAdminPage && !isLoginPage && !hasAdminSessionCookie(request)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPage || isAdminApi) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const isParticipantApi = pathname.startsWith("/api/participant");
  const isParticipantProtectedPage =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/tournaments" ||
    pathname.startsWith("/tournaments/");

  if (
    isParticipantApi &&
    !isPublicParticipantAuthPath(pathname) &&
    !hasParticipantSessionCookie(request)
  ) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  }

  if (isParticipantProtectedPage && !hasParticipantSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dev/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/dashboard",
    "/profile/:path*",
    "/profile",
    "/tournaments/:path*",
    "/tournaments",
    "/api/participant/:path*",
  ],
};
