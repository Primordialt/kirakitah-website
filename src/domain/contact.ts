import { z } from "zod";

export const contactSubjects = [
  "general",
  "gaming",
  "partnership",
  "collaboration",
  "media",
  "community",
  "other",
] as const;

export type ContactSubject = (typeof contactSubjects)[number];

export const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.enum(contactSubjects, {
    required_error: "Please select a subject",
  }),
  message: z.string().min(10, "Please enter a message of at least 10 characters"),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export interface ContactSubmissionResult {
  success: boolean;
  referenceId?: string;
  message?: string;
}
