import { withAdminApi, adminJson } from "@/server/admin/http";
import { evaluateLaunchReadiness } from "@/server/registration/launch-readiness";

export const runtime = "nodejs";

/**
 * Authenticated launch readiness diagnostics.
 * Requires dashboard:view. Never exposes secrets or applicant PII.
 *
 * Check statuses: CONFIGURED | NOT_CONFIGURED | ERROR | PENDING_PRODUCT_DECISION | DEFERRED
 * Gate: MVP_REGISTRATION_READY | REGISTRATION_READY | REGISTRATION_NOT_READY
 */
export async function GET(request: Request) {
  return withAdminApi(request, "dashboard:view", async (_session, requestId) => {
    const report = await evaluateLaunchReadiness();

    return adminJson(
      {
        success: true,
        competition: "KIRAKITAH GAMING 926",
        gate: report.gate,
        operatingMode: report.operatingMode,
        contactVerification: report.contactVerification,
        identityVerificationMode: report.identityVerificationMode,
        capacityPolicy: report.capacityPolicy,
        dataRetention: report.dataRetention,
        applicationsReceivable: report.applicationsReceivable,
        fullProductionVerificationOperational:
          report.fullProductionVerificationOperational,
        checks: report.checks.map((check) => ({
          id: check.id,
          label: check.label,
          status: check.status,
          requiredForMvp: check.requiredForMvp,
          requiredForFullProduction: check.requiredForFullProduction,
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
