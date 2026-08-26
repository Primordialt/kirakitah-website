import type {
  RegistrationFormValues,
  RegistrationResult,
} from "@/domain/registration";
import { toRegistrationSubmission } from "@/domain/registration";

export interface RegistrationSubmitOptions {
  includeGuardian: boolean;
  emailVerificationToken?: string;
}

export interface IRegistrationService {
  submit(
    data: RegistrationFormValues,
    options: RegistrationSubmitOptions,
  ): Promise<RegistrationResult>;
}

export type { RegistrationFormValues, RegistrationResult };

export { toRegistrationSubmission };
