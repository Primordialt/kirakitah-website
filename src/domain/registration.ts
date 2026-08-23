import { z } from "zod";

export interface GuardianInfo {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
}

export interface RegistrationConsents {
  rules: boolean;
  terms: boolean;
  privacy: boolean;
  codeOfConduct: boolean;
  mediaConsent: boolean;
}

export interface RegistrationSubmission {
  fullName: string;
  dateOfBirth: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  gamerTag: string;
  game: string;
  platform: string;
  gamingProfile?: string;
  timezone: string;
  availability: string[];
  socialHandles?: Record<string, string>;
  guardian?: GuardianInfo;
  consents: RegistrationConsents;
  eventId: string;
}

export interface RegistrationResult {
  success: boolean;
  referenceId: string;
}

function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export const guardianSchema = z.object({
  fullName: z.string().min(1, "Guardian full name is required"),
  relationship: z.string().min(1, "Guardian relationship is required"),
  email: z.string().email("Guardian email must be valid"),
  phone: z.string().min(1, "Guardian phone is required"),
});

export const registrationSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    email: z.string().email("Email must be valid"),
    phone: z.string().min(1, "Phone is required"),
    gamerTag: z.string().min(1, "Gamer tag is required"),
    game: z.string().min(1, "Game is required"),
    platform: z.string().min(1, "Platform is required"),
    gamingProfile: z.string().optional(),
    timezone: z.string().min(1, "Time zone is required"),
    availability: z
      .array(z.string())
      .min(1, "At least one availability slot is required"),
    socialHandles: z.record(z.string()).optional(),
    guardian: guardianSchema.optional(),
    consents: z.object({
      rules: z.literal(true, {
        errorMap: () => ({ message: "Rules acceptance is required" }),
      }),
      terms: z.literal(true, {
        errorMap: () => ({ message: "Terms acceptance is required" }),
      }),
      privacy: z.literal(true, {
        errorMap: () => ({ message: "Privacy acceptance is required" }),
      }),
      codeOfConduct: z.literal(true, {
        errorMap: () => ({ message: "Code of conduct acceptance is required" }),
      }),
      mediaConsent: z.literal(true, {
        errorMap: () => ({ message: "Media consent is required" }),
      }),
    }),
    eventId: z.string().min(1, "Event is required"),
  })
  .superRefine((data, ctx) => {
    const age = calculateAge(data.dateOfBirth);

    if (age < 18 && !data.guardian) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guardian information is required for participants under 18",
        path: ["guardian"],
      });
    }
  });

export type RegistrationFormValues = z.infer<typeof registrationSchema>;
