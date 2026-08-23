import type {
  RegistrationResult,
  RegistrationSubmission,
} from "@/domain/registration";

export interface IRegistrationService {
  submit(data: RegistrationSubmission): Promise<RegistrationResult>;
}
