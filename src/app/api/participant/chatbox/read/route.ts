import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import { isChatError } from "@/server/chat/errors";
import { markCommunityRead } from "@/server/chat/service";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    const session = await requireParticipantApiSession(request);
    const body = (await request.json()) as { lastReadMessageId?: string };
    if (!body.lastReadMessageId || typeof body.lastReadMessageId !== "string") {
      return NextResponse.json(apiError("VALIDATION_ERROR", "lastReadMessageId required."), {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }

    await markCommunityRead({
      participantAccountId: session.user.id,
      lastReadMessageId: body.lastReadMessageId,
    });

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
    if (isChatError(error)) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(apiError("INTERNAL_ERROR", "Unable to update read state."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
