export type ApiErrorPayload = {
  error?: { code?: string; message?: string };
  success?: boolean;
};

export async function participantFetch<T extends object>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ response: Response; payload: T & ApiErrorPayload }> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  let payload = {} as T & ApiErrorPayload;
  try {
    payload = (await response.json()) as T & ApiErrorPayload;
  } catch {
    payload = {} as T & ApiErrorPayload;
  }

  return { response, payload };
}

export function apiErrorMessage(
  payload: ApiErrorPayload,
  fallback: string,
): string {
  return payload.error?.message?.trim() || fallback;
}
