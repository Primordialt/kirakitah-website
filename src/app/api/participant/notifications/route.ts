import { NextResponse } from "next/server";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import { apiError } from "@/server/errors";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { listParticipantNotifications } from "@/server/participant/tournament-experience-service";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const url = new URL(request.url);
  const rawTournamentId = url.searchParams.get("tournamentId");
  const tournamentId = rawTournamentId
    ? resolveTournamentId(rawTournamentId)
    : undefined;

  if (rawTournamentId && !tournamentId) {
    return NextResponse.json(apiError("NOT_FOUND", "Tournament not found."), {
      status: 404,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }

  try {
    const session = await requireParticipantApiSession(request);
    const notifications = await listParticipantNotifications(
      session.user.id,
      tournamentId ?? undefined,
    );

    return NextResponse.json(
      { success: true, notifications, requestId },
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
      apiError("INTERNAL_ERROR", "Unable to load notifications."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
