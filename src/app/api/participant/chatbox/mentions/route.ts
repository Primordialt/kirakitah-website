import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import { searchMentionCandidates } from "@/server/chat/service";
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
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  try {
    await requireParticipantApiSession(request);
    const candidates = await searchMentionCandidates(q);
    return NextResponse.json(
      { success: true, candidates, requestId },
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
    return NextResponse.json(apiError("INTERNAL_ERROR", "Unable to search mentions."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
