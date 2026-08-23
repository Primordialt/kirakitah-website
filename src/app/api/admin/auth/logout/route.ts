import { NextResponse } from "next/server";
import { clearAdminSessionCookie, assertAdminCsrf } from "@/server/admin/auth";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    assertAdminCsrf(request);
    await clearAdminSessionCookie();
    return NextResponse.json(
      { success: true, requestId },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch {
    return NextResponse.json(apiError("UNAUTHORIZED", "Unable to logout."), {
      status: 401,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
