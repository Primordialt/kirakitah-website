import type {
  RegistrationResult,
  RegistrationSubmission,
} from "@/domain/registration";
import type { IRegistrationService } from "./types";

const MOCK_DELAY_MS = 500;

const MOCK_FAILURE_EMAIL = "fail@kirakitah.test";

function assertIdentityMetadataOnly(data: RegistrationSubmission): void {
  const { governmentId, playerPhoto } = data.identityVerification;

  for (const document of [governmentId, playerPhoto]) {
    const keys = Object.keys(document);
    if (
      keys.length !== 3 ||
      !keys.includes("fileName") ||
      !keys.includes("fileSize") ||
      !keys.includes("mimeType")
    ) {
      throw new Error("Identity documents must be submitted as metadata only");
    }
  }
}

export class MockRegistrationService implements IRegistrationService {
  async submit(data: RegistrationSubmission): Promise<RegistrationResult> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

    assertIdentityMetadataOnly(data);

    if (data.email.toLowerCase() === MOCK_FAILURE_EMAIL) {
      return {
        success: false,
        referenceId: "",
      };
    }

    return {
      success: true,
      referenceId: `MOCK-${data.eventId.toUpperCase()}-${Date.now()}`,
    };
  }
}
