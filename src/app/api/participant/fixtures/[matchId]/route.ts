import { NextResponse } from "next/server";
import { getParticipantFixtureByMatchId } from "@/server/participant/participant-fixture-service";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const requestId = getOrCreateRequestId(request);
  const { matchId } = await context.params;

  try {
    const session = await requireParticipantApiSession(request);
    const detail = await getParticipantFixtureByMatchId(session.user.id, matchId);

    if (!detail) {
      return NextResponse.json(apiError("NOT_FOUND", "Fixture not found."), {
        status: 404,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }

    return NextResponse.json(
      { success: true, ...detail, requestId },
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
      apiError("INTERNAL_ERROR", "Unable to load fixture."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
