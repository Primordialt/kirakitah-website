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
  | "NOT_IMPLEMENTED";

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
