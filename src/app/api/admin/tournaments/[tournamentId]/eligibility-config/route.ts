import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  EligibilityConfigError,
  getEligibilityConfigView,
  listEligibilityConfigHistory,
  updateYouTubeVerificationDeadline,
} from "@/server/tournament/eligibility/eligibility-config-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(
    request,
    "tournament:eligibility_config_view",
    async (session, requestId) => {
      const { tournamentId } = await context.params;
      const view = await getEligibilityConfigView(tournamentId, {
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
        recordViewAudit: true,
      });
      const history = await listEligibilityConfigHistory(tournamentId);

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
    },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(
    request,
    "tournament:eligibility_config_manage",
    async (session, requestId) => {
      const { tournamentId } = await context.params;
      const body = (await request.json()) as {
        reason?: string;
        deadlineDate?: string | null;
        deadlineTime?: string | null;
        clearDeadline?: boolean;
      };

      try {
        const result = await updateYouTubeVerificationDeadline({
          tournamentId,
          reason: body.reason ?? "",
          deadlineDate: body.deadlineDate,
          deadlineTime: body.deadlineTime,
          clearDeadline: body.clearDeadline,
          actorId: session.user.id,
          actorRole: session.user.role,
          requestId,
        });

        return adminJson({ success: true, ...result, requestId }, 200, requestId);
      } catch (error) {
        if (error instanceof EligibilityConfigError) {
          return adminJson(
            {
              success: false,
              error: { message: error.message, code: error.code },
              requestId,
            },
            error.status,
            requestId,
          );
        }
        throw error;
      }
    },
  );
}
