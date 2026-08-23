import { randomUUID } from "crypto";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Lightweight correlation ID for API logs.
 * Never encode PII into request IDs.
 */
export function getOrCreateRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER)?.trim();
  if (existing && existing.length <= 128) {
    return existing;
  }
  return randomUUID();
}

export function requestIdHeaders(requestId: string): Record<string, string> {
  return { "X-Request-Id": requestId };
}
