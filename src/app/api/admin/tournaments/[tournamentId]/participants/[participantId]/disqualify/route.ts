import { withAdminApi, adminJson } from "@/server/admin/http";
import { disqualifyParticipant } from "@/server/tournament/participant-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ tournamentId: string; participantId: string }>;
  },
) {
  return withAdminApi(
    request,
    "tournament:participant_disqualify",
    async (session, requestId) => {
      const { tournamentId, participantId } = await context.params;
      const body = (await request.json()) as { reason?: string };

      const result = await disqualifyParticipant({
        tournamentId,
        participantId,
        reason: body.reason ?? "",
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
