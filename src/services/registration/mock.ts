import type {
  RegistrationResult,
  RegistrationSubmission,
} from "@/domain/registration";
import type { IRegistrationService } from "./types";

const MOCK_DELAY_MS = 500;

export class MockRegistrationService implements IRegistrationService {
  async submit(data: RegistrationSubmission): Promise<RegistrationResult> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

    return {
      success: true,
      referenceId: `MOCK-${data.eventId.toUpperCase()}-${Date.now()}`,
    };
  }
}
