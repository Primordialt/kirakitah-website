import { withAdminApi, adminJson } from "@/server/admin/http";
import { evaluateLaunchReadiness } from "@/server/registration/launch-readiness";

export const runtime = "nodejs";

/**
 * Authenticated launch readiness diagnostics.
 * Never exposes secrets. Requires dashboard:view.
 */
export async function GET(request: Request) {
  return withAdminApi(request, "dashboard:view", async (_session, requestId) => {
    const report = await evaluateLaunchReadiness();

    return adminJson(
      {
        success: true,
        competition: "KIRAKITAH GAMING 926",
        gate: report.gate,
        identityVerificationMode: report.identityVerificationMode,
        capacityPolicy: report.capacityPolicy,
        dataRetention: report.dataRetention,
        checks: report.checks.map((check) => ({
          id: check.id,
          label: check.label,
          status: check.status,
          requiredForLaunch: check.requiredForLaunch,
          detail: check.detail,
        })),
        blockers: report.blockers,
        requestId,
      },
      200,
      requestId,
    );
  });
}
