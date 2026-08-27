/**
 * Standard API error shapes for Route Handlers.
 * @see docs/backend/ARCHITECTURE.md
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "NOT_IMPLEMENTED"
  | "CONFIGURATION_UNAVAILABLE"
  | "REGISTRATION_CLOSED"
  | "REGISTRATION_NOT_YET_OPEN"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_PHONE"
  | "DUPLICATE_IDENTITY"
  | "DUPLICATE_USERNAME"
  | "DUPLICATE_APPLICATION"
  | "EFOOTBALL_ACCOUNT_ALREADY_REGISTERED"
  | "PHOTO_INVALID"
  | "PHOTO_TOO_LARGE"
  | "VERIFICATION_INVALID"
  | "VERIFICATION_EXPIRED"
  | "VERIFICATION_EXHAUSTED"
  | "VERIFICATION_NOT_FOUND"
  | "VERIFICATION_ALREADY_USED"
  | "VERIFICATION_RATE_LIMITED"
  | "VERIFICATION_NOT_CONFIGURED"
  | "VERIFICATION_ALREADY_VERIFIED"
  | "VERIFICATION_COOLDOWN"
  | "PROVIDER_UNAVAILABLE"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "ACCOUNT_EXISTS"
  | "PROFILE_INCOMPLETE"
  | "PROFILE_NOT_VERIFIED"
  | "PROFILE_REQUIRES_CORRECTION"
  | "PROFILE_ALREADY_SUBMITTED"
  | "PROFILE_NOT_SUBMITTED"
  | "APPROVED_EFOOTBALL_ACCOUNT_LOCKED";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      ...(details?.length ? { details } : {}),
    },
  };
}
