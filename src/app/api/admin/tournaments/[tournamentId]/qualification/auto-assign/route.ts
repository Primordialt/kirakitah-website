import { withAdminApi, adminJson } from "@/server/admin/http";
import { autoAssignParticipantsToPods } from "@/server/tournament/qualification/auto-assign-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await context.params;

  return withAdminApi(request, "tournament:pod_manage", async (session, requestId) => {
    const result = await autoAssignParticipantsToPods({
      tournamentId,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
