import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import { ChatError, isChatError } from "@/server/chat/errors";
import { sendParticipantMessage } from "@/server/chat/service";
import { validateChatMessageContent } from "@/server/chat/validation";
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
    const body = (await request.json()) as {
      content?: string;
      replyToMessageId?: string | null;
    };

    if (typeof body.content !== "string") {
      return NextResponse.json(apiError("VALIDATION_ERROR", "Message is required."), {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }

    try {
      validateChatMessageContent(body.content);
    } catch {
      return NextResponse.json(apiError("VALIDATION_ERROR", "Invalid message."), {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }

    const message = await sendParticipantMessage({
      participantAccountId: session.user.id,
      content: body.content,
      replyToMessageId: body.replyToMessageId ?? null,
    });

    return NextResponse.json(
      { success: true, message, requestId },
      {
        status: 201,
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
    if (error instanceof ChatError || isChatError(error)) {
      const chatError = error as ChatError;
      return NextResponse.json(apiError(chatError.code, chatError.message), {
        status: chatError.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(apiError("INTERNAL_ERROR", "Unable to send message."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
