import { getPublicHealthSnapshot } from "@/server/registration/launch-readiness";
import { NextResponse } from "next/server";

/**
 * Liveness + safe configuration snapshot for operations.
 * Does not expose secrets, tokens, URLs with credentials, or encryption keys.
 * Does not call paid email/SMS providers.
 */
export async function GET() {
  const snapshot = getPublicHealthSnapshot();

  return NextResponse.json(
    {
      status: "ok",
      phase: "mvp-manual-registration",
      competition: "KIRAKITAH GAMING 926",
      registrationMode: snapshot.registrationMode,
      contactVerification: snapshot.contactVerification,
      databaseConfigured: snapshot.databaseConfigured,
      blobConfigured: snapshot.blobConfigured,
      encryptionConfigured: snapshot.encryptionConfigured,
      registrationConfigured: snapshot.registrationConfigured,
      emailConfigured: snapshot.emailConfigured,
      phoneConfigured: snapshot.phoneConfigured,
      adminConfigured: snapshot.adminConfigured,
      identityVerificationMode: snapshot.identityVerificationMode,
      dataSource: snapshot.dataSource,
      launchGateHint: snapshot.launchGateHint,
      automatedNinLookupEnabled: false,
      contactVerificationProviders: {
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
