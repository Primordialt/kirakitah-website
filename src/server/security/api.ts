/** Maximum registration payload size (form fields + player photo). */
export const MAX_REGISTRATION_BODY_BYTES = 256 * 1024;

export function assertRegistrationBodySize(contentLength: string | null): boolean {
  if (!contentLength) {
    return true;
  }

  const size = Number.parseInt(contentLength, 10);
  if (Number.isNaN(size)) {
    return true;
  }

  return size <= MAX_REGISTRATION_BODY_BYTES;
}

export const API_SECURITY_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
