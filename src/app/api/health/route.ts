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
      phase: "contact-verification",
      registrationBackendConfigured: isRegistrationBackendConfigured(),
      identityVerificationMode: "manual",
      automatedNinLookupEnabled: false,
      contactVerification: {
        emailProvider: process.env.EMAIL_VERIFICATION_PROVIDER ?? "default",
        phoneProvider: process.env.PHONE_VERIFICATION_PROVIDER ?? "default",
        mockAllowedInProduction: false,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
