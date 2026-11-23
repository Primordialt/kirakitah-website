import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiError } from "@/server/errors";
import {
  assertParticipantCsrf,
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { isPushConfigured, savePushSubscription } from "@/server/push/service";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import { getOrCreateRequestId, requestIdHeaders } from "@/server/security/request-id";

export const runtime = "nodejs";

function json(body: unknown, status: number, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
  });
}

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    await requireParticipantApiSession(request);
    return json({ success: true, enabled: isPushConfigured(), requestId }, 200, requestId);
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return json(apiError("UNAUTHORIZED", error.message), 401, requestId);
    }
    return json(apiError("INTERNAL_ERROR", "Unable to check phone alerts."), 500, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    const session = await requireParticipantApiSession(request);
    assertParticipantCsrf(request);
    if (!isPushConfigured()) {
      return json(
        apiError("CONFIGURATION_UNAVAILABLE", "Phone alerts are not switched on for this site yet."),
        503,
        requestId,
      );
    }
    const body = await request.json();
    await savePushSubscription(session.user.id, body);
    return json({ success: true, requestId }, 200, requestId);
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return json(apiError("UNAUTHORIZED", error.message), 401, requestId);
    }
    if (error instanceof ZodError) {
      return json(apiError("VALIDATION_ERROR", "This phone could not be saved for alerts."), 400, requestId);
    }
    return json(apiError("INTERNAL_ERROR", "Unable to turn on phone alerts."), 500, requestId);
  }
}
