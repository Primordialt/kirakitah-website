import { isRegistrationBackendConfigured } from "@/server/env";
import { NextResponse } from "next/server";

/**
 * Liveness check for deployment and monitoring.
 * Does not expose secrets or sensitive configuration values.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      phase: "manual-identity-review",
      registrationBackendConfigured: isRegistrationBackendConfigured(),
      identityVerificationMode: "manual",
      automatedNinLookupEnabled: false,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
