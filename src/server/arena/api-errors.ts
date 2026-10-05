import type { ApiErrorCode } from "@/server/errors";
import type { ArenaError } from "@/server/arena/errors";
import type { WalletError } from "@/server/wallet/errors";

const API_CODES = new Set<string>([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "RATE_LIMITED",
  "CONFLICT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INTERNAL_ERROR",
  "NOT_IMPLEMENTED",
  "CONFIGURATION_UNAVAILABLE",
  "INSUFFICIENT_BALANCE",
]);

export function toApiErrorCode(code: string): ApiErrorCode {
  if (API_CODES.has(code)) return code as ApiErrorCode;
  return "VALIDATION_ERROR";
}

export function arenaErrorCode(error: ArenaError): ApiErrorCode {
  if (error.code === "ROUND_NOT_ACTIVE" || error.code === "ROUND_EXPIRED") {
    return "CONFLICT";
  }
  if (error.code === "ARENA_DISABLED" || error.code === "ARENA_PAUSED") {
    return "CONFIGURATION_UNAVAILABLE";
  }
  return toApiErrorCode(error.code);
}

export function walletErrorCode(error: WalletError): ApiErrorCode {
  return toApiErrorCode(error.code);
}
