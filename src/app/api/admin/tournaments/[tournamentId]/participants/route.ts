import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  listTournamentParticipants,
  selectParticipant,
  formatEligibilitySummary,
} from "@/server/tournament/participant-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:view", async (_session, requestId) => {
    const { tournamentId } = await context.params;
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25");

    const result = await listTournamentParticipants({
      tournamentId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 25,
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(
    request,
    "tournament:participant_select",
    async (session, requestId) => {
      const { tournamentId } = await context.params;
      const body = (await request.json()) as { referenceId?: string };

      if (!body.referenceId?.trim()) {
        return adminJson(
          { error: { code: "VALIDATION_ERROR", message: "referenceId is required." } },
          400,
          requestId,
        );
      }

      const result = await selectParticipant({
        tournamentId,
        referenceId: body.referenceId.trim(),
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });

      const summary = formatEligibilitySummary(result.evaluation);

      return adminJson(
        {
          success: true,
          participant: {
            participantId: result.participantId,
            status: result.status,
            alreadySelected: result.alreadySelected,
          },
          eligibility: {
            eligible: result.evaluation.eligible,
            reasons: summary.reasons,
            rulesVersion: result.evaluation.rulesVersion,
          },
          requestId,
        },
        result.alreadySelected ? 200 : 201,
        requestId,
      );
    },
  );
}
