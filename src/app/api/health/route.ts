import { getPublicHealthSnapshot } from "@/server/registration/launch-readiness";
import { NextResponse } from "next/server";

/**
 * Liveness + safe configuration snapshot for operations.
 * Does not expose secrets, tokens, URLs with credentials, or encryption keys.
 */
export async function GET() {
  const snapshot = getPublicHealthSnapshot();

  return NextResponse.json(
    {
      status: "ok",
      phase: "production-registration-readiness",
      competition: "KIRAKITAH GAMING 926",
      databaseConfigured: snapshot.databaseConfigured,
      blobConfigured: snapshot.blobConfigured,
      registrationConfigured: snapshot.registrationConfigured,
      emailVerificationConfigured: snapshot.emailVerificationConfigured,
      phoneVerificationConfigured: snapshot.phoneVerificationConfigured,
      identityVerificationMode: snapshot.identityVerificationMode,
      adminAuthConfigured: snapshot.adminAuthConfigured,
      dataSource: snapshot.dataSource,
      launchGateHint: snapshot.launchGate,
      automatedNinLookupEnabled: false,
      contactVerification: {
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
