import type { ContactFormValues, ContactSubmissionResult } from "@/domain/contact";

export interface IContactService {
  submit(data: ContactFormValues): Promise<ContactSubmissionResult>;
}
