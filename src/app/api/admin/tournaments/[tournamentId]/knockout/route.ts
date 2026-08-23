import { withAdminApi, adminJson } from "@/server/admin/http";
import { generateKnockoutBracket, listKnockoutBracket } from "@/server/tournament/knockout/bracket-service";
import { getChampionPublicProjection } from "@/server/tournament/knockout/completion-service";
import {
  getPairingAdminView,
  reviseKnockoutPairings,
  setKnockoutPairings,
} from "@/server/tournament/knockout/pairing-service";
import { recordKnockoutMatchResult } from "@/server/tournament/knockout/progression-service";
import { getKnockoutDashboard } from "@/server/tournament/knockout/readiness-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:view", async (_session, requestId) => {
    const { tournamentId } = await context.params;
    const dashboard = await getKnockoutDashboard(tournamentId);
    const pairings = await getPairingAdminView(tournamentId);
    const bracket = await listKnockoutBracket(tournamentId);
    const champion = await getChampionPublicProjection(tournamentId);

    return adminJson(
      {
        success: true,
        dashboard,
        pairings,
        bracket,
        champion,
        requestId,
      },
      200,
      requestId,
    );
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await context.params;
  const body = (await request.json()) as {
    action?: string;
    pairings?: Array<{
      slotIndex: number;
      participantAId: string;
      participantBId: string;
    }>;
    reason?: string;
    matchId?: string;
    participantAScore?: number;
    participantBScore?: number;
  };

  if (body.action === "set_pairings") {
    return withAdminApi(request, "tournament:knockout_manage", async (session, requestId) => {
      const result = await setKnockoutPairings({
        tournamentId,
        pairings: body.pairings ?? [],
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "revise_pairings") {
    return withAdminApi(request, "tournament:knockout_manage", async (session, requestId) => {
      const result = await reviseKnockoutPairings({
        tournamentId,
        pairings: body.pairings ?? [],
        reason: body.reason ?? "",
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "generate_bracket") {
    return withAdminApi(request, "tournament:knockout_manage", async (session, requestId) => {
      const result = await generateKnockoutBracket({
        tournamentId,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "record_result") {
    return withAdminApi(request, "tournament:result_record", async (session, requestId) => {
      const result = await recordKnockoutMatchResult({
        matchId: body.matchId ?? "",
        participantAScore: body.participantAScore ?? -1,
        participantBScore: body.participantBScore ?? -1,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  return withAdminApi(request, "tournament:view", async (_s, requestId) =>
    adminJson(
      { error: { code: "VALIDATION_ERROR", message: "Unknown action." } },
      400,
      requestId,
    ),
  );
}
