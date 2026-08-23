import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isProductionLikeEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/dev") &&
    isProductionLikeEnvironment()
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dev/:path*"],
};
