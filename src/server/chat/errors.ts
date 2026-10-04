import type { ApiErrorCode } from "@/server/errors";

export class ChatError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(message: string, code: ApiErrorCode, status = 400) {
    super(message);
    this.name = "ChatError";
    this.code = code;
    this.status = status;
  }
}

export function isChatError(error: unknown): error is ChatError {
  return error instanceof ChatError;
}
