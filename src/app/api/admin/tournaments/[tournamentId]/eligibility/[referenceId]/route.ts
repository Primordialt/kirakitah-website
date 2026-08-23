import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  evaluateRegistrationEligibilityByReference,
} from "@/server/tournament/eligibility/eligibility-service";
import { formatEligibilitySummary } from "@/server/tournament/participant-service";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ tournamentId: string; referenceId: string }>;
  },
) {
  return withAdminApi(request, "tournament:eligibility", async (session, requestId) => {
    const { tournamentId, referenceId } = await context.params;
    const evaluation = await evaluateRegistrationEligibilityByReference(
      tournamentId,
      referenceId.toUpperCase(),
    );

    if (!evaluation) {
      return adminJson(
        { error: { code: "INTERNAL_ERROR", message: "Unable to evaluate eligibility." } },
        500,
        requestId,
      );
    }

    if (evaluation.applicationId) {
      await recordAdminAuditEvent({
        eventType: "ELIGIBILITY_EVALUATED",
        actorId: session.user.id,
        actorRole: session.user.role,
        applicationId: evaluation.applicationId,
        applicationReference: evaluation.applicationReference,
        requestId,
        metadata: {
          tournamentId,
          eligible: evaluation.eligible,
          reasonCount: evaluation.reasons.length,
        },
      });
    }

    const summary = formatEligibilitySummary(evaluation);

    return adminJson(
      {
        success: true,
        eligibility: {
          state: summary.state,
          reasons: summary.reasons,
          rulesVersion: evaluation.rulesVersion,
          evaluatedRequirements: evaluation.evaluatedRequirements,
        },
        requestId,
      },
      200,
      requestId,
    );
  });
}
