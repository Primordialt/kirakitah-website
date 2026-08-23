import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  listTournamentPhases,
  transitionPhaseStatus,
} from "@/server/tournament/competition/phase-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:view", async (_session, requestId) => {
    const { tournamentId } = await context.params;
    const phases = await listTournamentPhases(tournamentId);
    return adminJson({ success: true, phases, requestId }, 200, requestId);
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:phase_manage", async (session, requestId) => {
    await context.params;
    const body = (await request.json()) as {
      phaseId?: string;
      toStatus?: "draft" | "scheduled" | "active" | "completed" | "cancelled";
    };

    if (!body.phaseId || !body.toStatus) {
      return adminJson(
        { error: { code: "VALIDATION_ERROR", message: "phaseId and toStatus are required." } },
        400,
        requestId,
      );
    }

    const phase = await transitionPhaseStatus({
      phaseId: body.phaseId,
      toStatus: body.toStatus,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });

    return adminJson({ success: true, phase, requestId }, 200, requestId);
  });
}
