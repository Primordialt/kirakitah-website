import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import {
  assertParticipantCsrf,
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { PushNotReadyError, sendPushToAccount } from "@/server/push/service";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import { getOrCreateRequestId, requestIdHeaders } from "@/server/security/request-id";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const headers = { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) };
  try {
    const session = await requireParticipantApiSession(request);
    assertParticipantCsrf(request);
    const delivered = await sendPushToAccount(session.user.id, {
      title: "KIRAKITAH",
      body: "Phone alerts are on.",
      url: "/notifications",
    });
    return NextResponse.json({ success: true, delivered, requestId }, { status: 200, headers });
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), { status: 401, headers });
    }
    if (error instanceof PushNotReadyError) {
      return NextResponse.json(
        apiError("CONFIGURATION_UNAVAILABLE", error.message),
        { status: 503, headers },
      );
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to send a test alert."),
      { status: 500, headers },
    );
  }
}
