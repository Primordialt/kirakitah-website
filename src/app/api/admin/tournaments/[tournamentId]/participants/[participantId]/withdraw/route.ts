import { withAdminApi, adminJson } from "@/server/admin/http";
import { withdrawParticipant } from "@/server/tournament/participant-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ tournamentId: string; participantId: string }>;
  },
) {
  return withAdminApi(
    request,
    "tournament:participant_withdraw",
    async (session, requestId) => {
      const { tournamentId, participantId } = await context.params;

      const result = await withdrawParticipant({
        tournamentId,
        participantId,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });

      return adminJson(
        {
          success: true,
          participant: result,
          requestId,
        },
        200,
        requestId,
      );
    },
  );
}
