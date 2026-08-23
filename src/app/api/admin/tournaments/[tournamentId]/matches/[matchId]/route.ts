import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  correctMatchResult,
  forfeitMatch,
  getMatchById,
  getMatchResultHistory,
  markMatchDisputed,
  recordMatchResult,
} from "@/server/tournament/competition/match-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ tournamentId: string; matchId: string }>;
  },
) {
  return withAdminApi(request, "tournament:match_view", async (_session, requestId) => {
    const { tournamentId, matchId } = await context.params;
    const match = await getMatchById(matchId);
    if (!match || match.tournamentId !== tournamentId) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Match not found." } },
        404,
        requestId,
      );
    }
    const history = await getMatchResultHistory(matchId);
    return adminJson({ success: true, match, history, requestId }, 200, requestId);
  });
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ tournamentId: string; matchId: string }>;
  },
) {
  const { tournamentId, matchId } = await context.params;
  const body = (await request.json()) as {
    action?: "record" | "correct" | "dispute" | "forfeit";
    participantAScore?: number;
    participantBScore?: number;
    reason?: string;
    forfeitingParticipantId?: string;
  };

  if (body.action === "record") {
    return withAdminApi(request, "tournament:result_record", async (session, requestId) => {
      const match = await getMatchById(matchId);
      if (!match || match.tournamentId !== tournamentId) {
        return adminJson(
          { error: { code: "NOT_FOUND", message: "Match not found." } },
          404,
          requestId,
        );
      }
      const result = await recordMatchResult({
        matchId,
        participantAScore: body.participantAScore ?? -1,
        participantBScore: body.participantBScore ?? -1,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, result, requestId }, 201, requestId);
    });
  }

  if (body.action === "correct") {
    return withAdminApi(request, "tournament:result_correct", async (session, requestId) => {
      const result = await correctMatchResult({
        matchId,
        participantAScore: body.participantAScore ?? -1,
        participantBScore: body.participantBScore ?? -1,
        reason: body.reason ?? "",
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, result, requestId }, 200, requestId);
    });
  }

  if (body.action === "dispute") {
    return withAdminApi(request, "tournament:match_manage", async (session, requestId) => {
      const result = await markMatchDisputed({
        matchId,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, result, requestId }, 200, requestId);
    });
  }

  if (body.action === "forfeit") {
    return withAdminApi(request, "tournament:forfeit", async (session, requestId) => {
      const result = await forfeitMatch({
        matchId,
        forfeitingParticipantId: body.forfeitingParticipantId ?? "",
        reason: body.reason ?? "",
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, result, requestId }, 200, requestId);
    });
  }

  return withAdminApi(request, "tournament:match_view", async (_session, requestId) =>
    adminJson(
      { error: { code: "VALIDATION_ERROR", message: "Unknown match action." } },
      400,
      requestId,
    ),
  );
}
