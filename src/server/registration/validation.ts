import {
  calculateAge,
  guardianSchema,
  MINIMUM_TOURNAMENT_AGE,
  requiresGuardian,
} from "@/domain/registration";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import type { IdentificationType } from "@/lib/identification";
import {
  normalizeIdentificationNumber,
  validateIdentificationNumber,
} from "@/lib/identification";
import { validatePlayerPhotoFile, validatePlayerPhotoMagicBytes } from "@/server/registration/blob-storage";
import {
  isValidNormalizedPhone,
  normalizePhoneForUniqueness,
} from "@/server/registration/phone-normalize";
import { z } from "zod";

export interface ParsedRegistrationRequest {
  fullName: string;
  dateOfBirth: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  gamerTag: string;
  game: string;
  platform: string;
  gamingProfile?: string;
  timezone: string;
  availability: string[];
  socialHandles?: Record<string, string>;
  guardian?: z.infer<typeof guardianSchema>;
  consents: {
    rules: true;
    terms: true;
    privacy: true;
    codeOfConduct: true;
    mediaConsent: true;
  };
  eventId: string;
  playerPhoto: File;
}

const consentSchema = z.object({
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
});

function requiredString(
  formData: FormData,
  key: string,
  message: string,
): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message,
        path: [key],
      },
    ]);
  }
  return value.trim();
}

export async function parseRegistrationFormData(
  formData: FormData,
): Promise<ParsedRegistrationRequest> {
  const details: z.ZodIssue[] = [];

  const addIssue = (path: string, message: string) => {
    details.push({
      code: z.ZodIssueCode.custom,
      message,
      path: path.split("."),
    });
  };

  let fullName = "";
  let dateOfBirth = "";
  let country = "";
  let city = "";
  let email = "";
  let phone = "";
  let identificationTypeRaw = "";
  let identificationNumber = "";
  let gamerTag = "";
  let game = "";
  let platform = "";
  let gamingProfile: string | undefined;
  let timezone = "";
  let availability: string[] = [];
  let socialHandles: Record<string, string> | undefined;
  let guardian: z.infer<typeof guardianSchema> | undefined;
  let consents: ParsedRegistrationRequest["consents"] | undefined;
  let eventId = "";
  let playerPhoto: File | undefined;

  try {
    fullName = requiredString(formData, "fullName", "Full name is required");
    dateOfBirth = requiredString(formData, "dateOfBirth", "Date of birth is required");
    country = requiredString(formData, "country", "Country is required");
    city = requiredString(formData, "city", "City is required");
    email = requiredString(formData, "email", "Email is required").toLowerCase();
    phone = requiredString(formData, "phone", "Phone is required");
    identificationTypeRaw = requiredString(
      formData,
      "identificationType",
      "Identification type is required",
    );
    identificationNumber = requiredString(
      formData,
      "identificationNumber",
      "Identification number is required",
    );
    gamerTag = requiredString(formData, "gamerTag", "Gamer tag is required");
    game = requiredString(formData, "game", "Game is required");
    platform = requiredString(formData, "platform", "Platform is required");
    timezone = requiredString(formData, "timezone", "Time zone is required");
    eventId = requiredString(formData, "eventId", "Event is required");

    const gamingProfileRaw = formData.get("gamingProfile");
    if (typeof gamingProfileRaw === "string" && gamingProfileRaw.trim()) {
      gamingProfile = gamingProfileRaw.trim();
    }

    const availabilityRaw = formData.get("availability");
    if (typeof availabilityRaw === "string") {
      availability = JSON.parse(availabilityRaw) as string[];
    }
    if (!Array.isArray(availability) || availability.length === 0) {
      addIssue("availability", "At least one availability slot is required");
    }

    const socialRaw = formData.get("socialHandles");
    if (typeof socialRaw === "string" && socialRaw.trim()) {
      socialHandles = JSON.parse(socialRaw) as Record<string, string>;
    }

    const guardianRaw = formData.get("guardian");
    if (typeof guardianRaw === "string" && guardianRaw.trim()) {
      guardian = JSON.parse(guardianRaw) as z.infer<typeof guardianSchema>;
    }

    const consentsRaw = formData.get("consents");
    if (typeof consentsRaw === "string") {
      consents = JSON.parse(consentsRaw) as ParsedRegistrationRequest["consents"];
    }

    const photoEntry = formData.get("playerPhoto");
    if (photoEntry instanceof File) {
      playerPhoto = photoEntry;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    addIssue("form", "Invalid registration submission payload");
  }

  const emailResult = z.string().email("Email must be valid").safeParse(email);
  if (!emailResult.success) {
    addIssue("email", "Email must be valid");
  }

  if (identificationTypeRaw !== "nin" && identificationTypeRaw !== "passport") {
    addIssue("identificationType", "Identification type is required");
  }

  const identificationType = identificationTypeRaw as IdentificationType;
  if (identificationType === "nin" || identificationType === "passport") {
    const idMessage = validateIdentificationNumber(
      identificationType,
      identificationNumber,
    );
    if (idMessage) {
      addIssue("identificationNumber", idMessage);
    }
  }

  const age = dateOfBirth ? calculateAge(dateOfBirth) : -1;
  if (age >= 0 && age < MINIMUM_TOURNAMENT_AGE) {
    addIssue(
      "dateOfBirth",
      `You must be at least ${MINIMUM_TOURNAMENT_AGE} years old to participate`,
    );
  }

  if (dateOfBirth && requiresGuardian(dateOfBirth)) {
    const guardianResult = guardianSchema.safeParse(guardian);
    if (!guardianResult.success) {
      for (const issue of guardianResult.error.issues) {
        addIssue(`guardian.${issue.path.join(".")}`, issue.message);
      }
    } else {
      guardian = guardianResult.data;
    }
  } else {
    guardian = undefined;
  }

  const consentsResult = consentSchema.safeParse(consents);
  if (!consentsResult.success) {
    for (const issue of consentsResult.error.issues) {
      addIssue(`consents.${issue.path.join(".")}`, issue.message);
    }
  } else {
    consents = consentsResult.data;
  }

  if (!playerPhoto) {
    addIssue("playerPhoto", "Player photo is required");
  } else {
    const photoMessage = validatePlayerPhotoFile(playerPhoto);
    if (photoMessage) {
      addIssue("playerPhoto", photoMessage);
    } else {
      const magicMessage = await validatePlayerPhotoMagicBytes(playerPhoto);
      if (magicMessage) {
        addIssue("playerPhoto", magicMessage);
      }
    }
  }

  if (phone) {
    const normalizedPhone = normalizePhoneForUniqueness(phone);
    if (!isValidNormalizedPhone(normalizedPhone)) {
      addIssue("phone", "Enter a valid phone number");
    }
  }

  if (eventId !== TOURNAMENT_EVENT_ID) {
    addIssue("eventId", "Registration is not open for this event");
  }

  if (game !== "eFootball Mobile") {
    addIssue("game", "Game must be eFootball Mobile");
  }

  if (details.length > 0 || !consents || !playerPhoto) {
    throw new z.ZodError(details);
  }

  const normalizedIdentificationNumber = normalizeIdentificationNumber(
    identificationType,
    identificationNumber,
  );

  return {
    fullName,
    dateOfBirth,
    country,
    city,
    email,
    phone,
    identificationType,
    identificationNumber: normalizedIdentificationNumber,
    gamerTag,
    game,
    platform,
    gamingProfile,
    timezone,
    availability,
    socialHandles,
    guardian,
    consents,
    eventId,
    playerPhoto,
  };
}
