import { withAdminApi, adminJson } from "@/server/admin/http";
import { getPhaseBySlug } from "@/server/tournament/competition/phase-service";
import { listQualificationStandings } from "@/server/tournament/competition/standings-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:standings_view", async (_session, requestId) => {
    const { tournamentId } = await context.params;
    const url = new URL(request.url);
    const phaseSlug = url.searchParams.get("phase") ?? "qualification";
    const phase = await getPhaseBySlug(tournamentId, phaseSlug);
    if (!phase) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Phase not found." } },
        404,
        requestId,
      );
    }

    const standings = await listQualificationStandings(phase.id);
    return adminJson(
      {
        success: true,
        phase: { id: phase.id, slug: phase.slug, name: phase.name },
        standings,
        note:
          "Standings aggregation uses a technical placeholder scoring model. Final KG926 scoring/ranking remains PENDING PRODUCT DECISION.",
        requestId,
      },
      200,
      requestId,
    );
  });
}
