/**
 * Server-side registration types for Route Handlers and persistence adapters.
 * @see docs/backend/REGISTRATION-SPEC.md
 */

export type { RegistrationApplicationRecord, RegistrationGuardianRecord, RegistrationApplicationStatus } from "@/domain/registration-application";

export interface CreateRegistrationResult {
  referenceId: string;
  status: "received";
}

export interface StoredIdentityFile {
  blobKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}
