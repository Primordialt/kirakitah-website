import { withAdminApi, adminJson } from "@/server/admin/http";
import { getTournamentById } from "@/server/tournament/participant-service";
import { listTournamentPhases } from "@/server/tournament/competition/phase-service";
import { parseCompetitionRules } from "@/server/tournament/competition/competition-rules";
import { toPublicTournamentSummary } from "@/server/tournament/competition/public-projections";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:view", async (_session, requestId) => {
    const { tournamentId } = await context.params;
    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Tournament not found." } },
        404,
        requestId,
      );
    }

    const phases = await listTournamentPhases(tournamentId);
    const competitionRules = parseCompetitionRules(tournament.competitionRules);

    return adminJson(
      {
        success: true,
        tournament: toPublicTournamentSummary(tournament),
        competitionRules,
        phases: phases.map((phase) => ({
          id: phase.id,
          name: phase.name,
          slug: phase.slug,
          phaseType: phase.phaseType,
          sequence: phase.sequence,
          status: phase.status,
          participantLimit: phase.participantLimit,
          qualificationTarget: phase.qualificationTarget,
          rulesVersion: phase.rulesVersion,
        })),
        requestId,
      },
      200,
      requestId,
    );
  });
}
