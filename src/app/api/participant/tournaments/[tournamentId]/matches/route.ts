import { NextResponse } from "next/server";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import { apiError } from "@/server/errors";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { listParticipantMatches } from "@/server/participant/tournament-experience-service";
import { getPlayerSafeUpcomingMatch } from "@/server/tournament/scheduling/player-match-projection";
import { resolveParticipantTournamentContext } from "@/server/participant/tournament-context";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  const requestId = getOrCreateRequestId(request);
  const { tournamentId: rawId } = await context.params;
  const tournamentId = resolveTournamentId(rawId);

  if (!tournamentId) {
    return NextResponse.json(apiError("NOT_FOUND", "Tournament not found."), {
      status: 404,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }

  try {
    const session = await requireParticipantApiSession(request);
    const ctx = await resolveParticipantTournamentContext(
      session.user.id,
      tournamentId,
    );

    const matches = await listParticipantMatches(session.user.id, tournamentId);
    const upcoming =
      ctx.participantId && ctx.tournamentParticipant?.status === "selected"
        ? await getPlayerSafeUpcomingMatch({
            tournamentId,
            participantId: ctx.participantId,
          })
        : null;

    return NextResponse.json(
      { success: true, matches, upcoming, requestId },
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
      apiError("INTERNAL_ERROR", "Unable to load matches."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
