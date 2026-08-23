import { withAdminApi, adminJson } from "@/server/admin/http";
import { advanceAllPodWinnersToTop32 } from "@/server/tournament/qualification/match-engine";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:phase_manage", async (session, requestId) => {
    const { tournamentId } = await context.params;
    const result = await advanceAllPodWinnersToTop32({
      tournamentId,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });
    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
