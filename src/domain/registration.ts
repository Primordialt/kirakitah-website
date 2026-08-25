import type { IdentificationType } from "@/lib/identification";
import {
  normalizeIdentificationNumber,
  validateIdentificationNumber,
} from "@/lib/identification";
import type { IdentityDocumentMetadata } from "@/lib/identity-upload";
import {
  MAX_IDENTITY_FILE_SIZE_BYTES,
  PLAYER_PHOTO_ACCEPTED_TYPES,
  formatAcceptedTypes,
  formatFileSize,
  isAcceptedFileType,
  toIdentityDocumentMetadata,
} from "@/lib/identity-upload";
import { z } from "zod";

export interface GuardianInfo {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  consent: boolean;
}

export interface RegistrationConsents {
  rules: boolean;
  terms: boolean;
  privacy: boolean;
  codeOfConduct: boolean;
  mediaConsent: boolean;
}

export interface IdentityVerificationSubmission {
  identificationType: IdentificationType;
  identificationNumber: string;
  playerPhoto: IdentityDocumentMetadata;
}

export interface RegistrationSubmission {
  fullName: string;
  dateOfBirth: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  identityVerification: IdentityVerificationSubmission;
  gamerTag: string;
  game: string;
  platform: string;
  gamingProfile?: string;
  timezone: string;
  availability: string[];
  socialHandles: {
    x: string;
    instagram: string;
    tiktok: string;
  };
  socialFollowAttestation: true;
  guardian?: GuardianInfo;
  consents: RegistrationConsents;
  eventId: string;
}

export interface RegistrationResult {
  success: boolean;
  referenceId: string;
  contactVerification?: {
    email: ContactChannelVerificationState;
    phone: ContactChannelVerificationState;
  };
}

export type ContactChannelVerificationStatus =
  | "pending"
  | "verified"
  | "skipped"
  | "unavailable";

export interface ContactChannelVerificationState {
  status: ContactChannelVerificationStatus;
  challengeId?: string;
  resendAvailableAt?: string;
}

export const MINIMUM_TOURNAMENT_AGE = 10;

export function calculateAge(dateOfBirth: string): number {
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

export function requiresGuardian(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const age = calculateAge(dateOfBirth);
  return age >= MINIMUM_TOURNAMENT_AGE && age < 18;
}

export const guardianSchema = z.object({
  fullName: z.string().min(1, "Guardian full name is required"),
  relationship: z.string().min(1, "Guardian relationship is required"),
  email: z.string().email("Guardian email must be valid"),
  phone: z.string().min(1, "Guardian phone is required"),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Guardian consent is required" }),
  }),
});

const playerPhotoFileSchema = z
  .instanceof(File, { message: "Player photo is required" })
  .refine((file) => file.size > 0, { message: "Player photo is required" })
  .refine((file) => isAcceptedFileType(file, PLAYER_PHOTO_ACCEPTED_TYPES), {
    message: `Player photo must be ${formatAcceptedTypes(PLAYER_PHOTO_ACCEPTED_TYPES)}`,
  })
  .refine((file) => file.size <= MAX_IDENTITY_FILE_SIZE_BYTES, {
    message: `Player photo must be ${formatFileSize(MAX_IDENTITY_FILE_SIZE_BYTES)} or smaller`,
  });

export const identityVerificationFormSchema = z
  .object({
    identificationType: z.enum(["nin", "passport"], {
      errorMap: () => ({ message: "Identification type is required" }),
    }),
    identificationNumber: z.string().min(1, "Identification number is required"),
    playerPhoto: playerPhotoFileSchema,
  })
  .superRefine((data, ctx) => {
    const message = validateIdentificationNumber(
      data.identificationType,
      data.identificationNumber,
    );

    if (message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["identificationNumber"],
      });
    }
  });

export const registrationSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    email: z.string().email("Email must be valid"),
    phone: z.string().min(1, "Phone is required"),
    identityVerification: identityVerificationFormSchema,
    gamerTag: z.string().min(1, "Gamer tag is required"),
    game: z.string().min(1, "Game is required"),
    platform: z.string().min(1, "Platform is required"),
    gamingProfile: z.string().optional(),
    timezone: z.string().min(1, "Time zone is required"),
    availability: z
      .array(z.string())
      .min(1, "At least one availability slot is required"),
    socialHandles: z.object({
      x: z.string().min(1, "X username is required"),
      instagram: z.string().min(1, "Instagram username is required"),
      tiktok: z.string().min(1, "TikTok username is required"),
    }),
    socialFollowAttestation: z.literal(true, {
      errorMap: () => ({
        message:
          "Confirm that you follow KIRAKITAH on all three official social platforms",
      }),
    }),
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

    if (age < MINIMUM_TOURNAMENT_AGE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `You must be at least ${MINIMUM_TOURNAMENT_AGE} years old to participate`,
        path: ["dateOfBirth"],
      });
    }

    if (age < 18 && age >= MINIMUM_TOURNAMENT_AGE && !data.guardian) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guardian information is required for participants under 18",
        path: ["guardian"],
      });
    }
  });

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

export function toRegistrationSubmission(
  data: RegistrationFormValues,
  options: { includeGuardian: boolean },
): RegistrationSubmission {
  const { identificationType, identificationNumber } = data.identityVerification;

  return {
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth,
    country: data.country,
    city: data.city,
    email: data.email,
    phone: data.phone,
    identityVerification: {
      identificationType,
      identificationNumber: normalizeIdentificationNumber(
        identificationType,
        identificationNumber,
      ),
      playerPhoto: toIdentityDocumentMetadata(data.identityVerification.playerPhoto),
    },
    gamerTag: data.gamerTag,
    game: data.game,
    platform: data.platform,
    gamingProfile: data.gamingProfile || undefined,
    timezone: data.timezone,
    availability: data.availability,
    socialHandles: {
      x: data.socialHandles.x.trim(),
      instagram: data.socialHandles.instagram.trim(),
      tiktok: data.socialHandles.tiktok.trim(),
    },
    socialFollowAttestation: true,
    guardian: options.includeGuardian ? data.guardian : undefined,
    consents: data.consents,
    eventId: data.eventId,
  };
}
