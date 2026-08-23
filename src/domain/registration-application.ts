/**
 * Registration application lifecycle types.
 * Used by future backend persistence and admin review — not by the public form directly.
 */

import type { IdentificationType } from "@/lib/identification";

export type RegistrationApplicationStatus =
  | "received"
  | "under_review"
  | "verified"
  | "rejected"
  | "withdrawn";

export interface RegistrationApplicationRecord {
  id: string;
  referenceId: string;
  eventId: string;
  status: RegistrationApplicationStatus;
  fullName: string;
  dateOfBirth: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  identificationType: IdentificationType;
  /** Stored normalized; treat as sensitive PII in production */
  identificationNumber: string;
  gamerTag: string;
  game: string;
  platform: string;
  gamingProfile?: string;
  timezone: string;
  availability: string[];
  socialHandles?: Record<string, string>;
  /** Internal blob storage key — never expose via public API */
  playerPhotoBlobKey: string;
  playerPhotoMeta: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  consents: {
    rules: boolean;
    terms: boolean;
    privacy: boolean;
    codeOfConduct: boolean;
    mediaConsent: boolean;
    acceptedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Guardian record — stored separately; must not be included in public API responses.
 */
export interface RegistrationGuardianRecord {
  applicationId: string;
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  consentAt: string;
}
