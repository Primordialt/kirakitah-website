import type {
  Control,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import type { RegistrationFormValues } from "@/domain/registration";

export interface FormSectionProps {
  register: UseFormRegister<RegistrationFormValues>;
  control: Control<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
}
