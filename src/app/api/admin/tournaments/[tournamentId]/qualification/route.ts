import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  ensureQualificationPods,
  getQualificationDashboard,
  listQualificationPods,
  listTop32Qualifiers,
} from "@/server/tournament/qualification/pod-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:view", async (_session, requestId) => {
    const { tournamentId } = await context.params;
    await ensureQualificationPods(tournamentId);
    const dashboard = await getQualificationDashboard(tournamentId);
    const pods = await listQualificationPods(tournamentId);
    const top32 = await listTop32Qualifiers(tournamentId);

    return adminJson(
      {
        success: true,
        dashboard,
        pods: pods.map((pod) => ({
          id: pod.id,
          podNumber: pod.podNumber,
          status: pod.status,
          capacity: pod.capacity,
          hostSemifinalIndex: pod.hostSemifinalIndex,
          qualifierParticipantId: pod.qualifierParticipantId,
        })),
        top32,
        requestId,
      },
      200,
      requestId,
    );
  });
}
