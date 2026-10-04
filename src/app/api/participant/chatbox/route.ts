import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import { ChatError, isChatError } from "@/server/chat/errors";
import {
  getCommunityRoomState,
  listCommunityMessages,
} from "@/server/chat/service";
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

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    const session = await requireParticipantApiSession(request);
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");

    const [room, page] = await Promise.all([
      getCommunityRoomState(session.user.id),
      listCommunityMessages({
        participantAccountId: session.user.id,
        cursor,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        room,
        messages: page.messages,
        nextCursor: page.nextCursor,
        requestId,
      },
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
    return NextResponse.json(apiError("INTERNAL_ERROR", "Unable to load chat."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
