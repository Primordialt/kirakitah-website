import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import {
  assertParticipantCsrf,
  clearParticipantSessionCookie,
  getParticipantSessionFromRequest,
  getParticipantSessionTokenFromRequest,
  ParticipantAuthenticationError,
} from "@/server/participant/auth/session";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  try {
    assertParticipantCsrf(request);

    const session = await getParticipantSessionFromRequest(request);
    const token = getParticipantSessionTokenFromRequest(request);
    await clearParticipantSessionCookie(token);

    if (session) {
      await recordParticipantAuditEvent({
        eventType: "PARTICIPANT_LOGOUT",
        accountId: session.user.id,
        actor: session.user.id,
      }).catch(() => undefined);
    }

    return NextResponse.json(
      { success: true, requestId },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to sign out."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
