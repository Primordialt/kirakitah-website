import type {
  RegistrationResult,
  RegistrationSubmission,
} from "@/domain/registration";
import type { IRegistrationService } from "./types";

const MOCK_DELAY_MS = 500;

const MOCK_FAILURE_EMAIL = "fail@kirakitah.test";

export class MockRegistrationService implements IRegistrationService {
  async submit(data: RegistrationSubmission): Promise<RegistrationResult> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

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
