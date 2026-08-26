import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { listParticipantTournamentSummaries } from "@/server/participant/tournament-experience-service";
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
    const tournaments = await listParticipantTournamentSummaries(
      session.user.id,
    );

    return NextResponse.json(
      { success: true, tournaments, requestId },
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
      apiError("INTERNAL_ERROR", "Unable to load tournaments."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
