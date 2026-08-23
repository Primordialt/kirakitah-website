import { withAdminApi, adminJson } from "@/server/admin/http";
import { advanceQualifiers } from "@/server/tournament/competition/advancement-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:phase_manage", async (session, requestId) => {
    const { tournamentId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      explicitRankingParticipantIds?: string[];
    };

    const result = await advanceQualifiers({
      tournamentId,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
      explicitRankingParticipantIds: body.explicitRankingParticipantIds,
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
