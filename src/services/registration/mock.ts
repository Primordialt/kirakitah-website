import type {
  RegistrationFormValues,
  RegistrationResult,
} from "@/domain/registration";
import { toRegistrationSubmission } from "@/domain/registration";
import { isMockRegistrationAllowed } from "@/config/data-source";
import type { IRegistrationService } from "./types";

const MOCK_DELAY_MS = 500;

const MOCK_FAILURE_EMAIL = "fail@kirakitah.test";

function assertPlayerPhotoMetadataOnly(
  data: ReturnType<typeof toRegistrationSubmission>,
): void {
  const { playerPhoto } = data.identityVerification;
  const keys = Object.keys(playerPhoto);

  if (
    keys.length !== 3 ||
    !keys.includes("fileName") ||
    !keys.includes("fileSize") ||
    !keys.includes("mimeType")
  ) {
    throw new Error("Player photo must be submitted as metadata only");
  }
}

export class MockRegistrationService implements IRegistrationService {
  async submit(
    data: RegistrationFormValues,
    options: { includeGuardian: boolean },
  ): Promise<RegistrationResult> {
    if (!isMockRegistrationAllowed()) {
      throw new Error(
        "CONFIGURATION_UNAVAILABLE: Mock registration cannot run in production.",
      );
    }

    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

    const submission = toRegistrationSubmission(data, options);
    assertPlayerPhotoMetadataOnly(submission);

    if (submission.email.toLowerCase() === MOCK_FAILURE_EMAIL) {
      return {
        success: false,
        referenceId: "",
      };
    }

    return {
      success: true,
      referenceId: `MOCK-${submission.eventId.toUpperCase()}-${Date.now()}`,
      contactVerification: {
        email: { status: "unavailable" },
        phone: { status: "unavailable" },
      },
    };
  }
}
