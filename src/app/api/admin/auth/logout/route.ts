import { NextResponse } from "next/server";
import {
  assertAdminCsrf,
  clearAdminSessionCookie,
  getAdminSessionFromRequest,
} from "@/server/admin/auth";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
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
    const session = getAdminSessionFromRequest(request);
    await clearAdminSessionCookie();

    if (session) {
      await recordAdminAuditEvent({
        eventType: "ADMIN_LOGOUT",
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      }).catch(() => undefined);
    }

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
