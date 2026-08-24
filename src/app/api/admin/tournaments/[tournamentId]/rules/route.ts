import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  getCompetitionPolicyView,
  listCompetitionPolicyHistory,
  recordCompetitionPolicyChange,
} from "@/server/tournament/rules/policy-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:policy_view", async (session, requestId) => {
    const { tournamentId } = await context.params;
    const view = await getCompetitionPolicyView(tournamentId, {
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
      recordViewAudit: true,
    });
    const history = await listCompetitionPolicyHistory(tournamentId);

    return adminJson(
      {
        success: true,
        ...view,
        history,
        requestId,
      },
      200,
      requestId,
    );
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:policy_manage", async (session, requestId) => {
    const { tournamentId } = await context.params;
    const body = (await request.json()) as {
      reason?: string;
      notes?: string;
    };

    const result = await recordCompetitionPolicyChange({
      tournamentId,
      reason: body.reason ?? "",
      notes: body.notes,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
