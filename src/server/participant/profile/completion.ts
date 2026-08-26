import {
  calculateAge,
  MINIMUM_TOURNAMENT_AGE,
  requiresGuardian,
} from "@/domain/registration";
import type {
  ParticipantGuardianRecord,
  PlayerPhotoMeta,
} from "@/server/db/schema";

export const PROFILE_REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "country",
  "city",
  "phone",
  "identificationType",
  "identificationNumber",
  "gamerTag",
  "playerPhoto",
] as const;

export type ProfileRequiredField = (typeof PROFILE_REQUIRED_FIELDS)[number];

export interface ProfileCompletionInput {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  city?: string | null;
  phone?: string | null;
  identificationType?: string | null;
  /** True when identification number hash/encrypted are present. */
  hasIdentificationNumber?: boolean;
  gamerTag?: string | null;
  playerPhotoBlobKey?: string | null;
  playerPhotoMeta?: PlayerPhotoMeta | null;
  guardian?: ParticipantGuardianRecord | null;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/**
 * Server-side completion percent. Never trust client-reported completion.
 */
export function calculateCompletionPercent(
  input: ProfileCompletionInput,
): number {
  const missing = getMissingRequiredFields(input);
  const total = getRequiredFieldCount(input.dateOfBirth);
  const complete = total - missing.length;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((complete / total) * 100)));
}

export function getRequiredFieldCount(dateOfBirth?: string | null): number {
  let count = PROFILE_REQUIRED_FIELDS.length;
  if (dateOfBirth && requiresGuardian(dateOfBirth)) {
    count += 1; // guardian
  }
  return count;
}

export function getMissingRequiredFields(
  input: ProfileCompletionInput,
): string[] {
  const missing: string[] = [];

  if (!hasText(input.firstName)) missing.push("firstName");
  if (!hasText(input.lastName)) missing.push("lastName");
  if (!hasText(input.dateOfBirth)) missing.push("dateOfBirth");
  if (!hasText(input.country)) missing.push("country");
  if (!hasText(input.city)) missing.push("city");
  if (!hasText(input.phone)) missing.push("phone");
  if (!hasText(input.identificationType)) missing.push("identificationType");
  if (!input.hasIdentificationNumber) missing.push("identificationNumber");
  if (!hasText(input.gamerTag)) missing.push("gamerTag");
  if (!hasText(input.playerPhotoBlobKey) || !input.playerPhotoMeta) {
    missing.push("playerPhoto");
  }

  if (input.dateOfBirth) {
    const age = calculateAge(input.dateOfBirth);
    if (age >= 0 && age < MINIMUM_TOURNAMENT_AGE) {
      missing.push("dateOfBirth");
    }
    if (requiresGuardian(input.dateOfBirth)) {
      if (
        !input.guardian ||
        !hasText(input.guardian.fullName) ||
        !hasText(input.guardian.relationship) ||
        !hasText(input.guardian.email) ||
        !hasText(input.guardian.phone) ||
        !hasText(input.guardian.consentAt)
      ) {
        missing.push("guardian");
      }
    }
  }

  return [...new Set(missing)];
}

export function isProfileComplete(input: ProfileCompletionInput): boolean {
  return getMissingRequiredFields(input).length === 0;
}
