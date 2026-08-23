import {
  ContactVerificationError,
  resendContactChallenge,
} from "@/server/verification/contact/initiate";
import { isRegistrationBackendConfigured } from "@/server/env";
import { apiError } from "@/server/errors";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const resendSchema = z.object({
  referenceId: z.string().min(1),
  channel: z.enum(["email", "phone"]),
});

function jsonResponse(body: unknown, status: number, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...API_SECURITY_HEADERS,
      ...requestIdHeaders(requestId),
    },
  });
}

/**
 * Resends an email or phone ownership challenge with cooldown and rate limits.
 */
export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  if (!isRegistrationBackendConfigured()) {
    return jsonResponse(
      apiError("VERIFICATION_NOT_CONFIGURED", "Verification backend is not configured."),
      503,
      requestId,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Expected JSON body."),
      400,
      requestId,
    );
  }

  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Invalid resend request."),
      400,
      requestId,
    );
  }

  try {
    const result = await resendContactChallenge(parsed.data);

    return jsonResponse(
      {
        success: true,
        channel: parsed.data.channel,
        status: result.status,
        challengeId: result.challengeId,
        resendAvailableAt: result.resendAvailableAt,
        requestId,
      },
      200,
      requestId,
    );
  } catch (error) {
    if (error instanceof ContactVerificationError) {
      const status =
        error.code === "VERIFICATION_RATE_LIMITED" ||
        error.code === "VERIFICATION_COOLDOWN"
          ? 429
          : error.code === "VERIFICATION_NOT_CONFIGURED" ||
              error.code === "PROVIDER_UNAVAILABLE"
            ? 503
            : 400;

      return jsonResponse(
        {
          ...apiError(error.code, error.message),
          ...(error.resendAvailableAt
            ? { resendAvailableAt: error.resendAvailableAt }
            : {}),
        },
        status,
        requestId,
      );
    }

    return jsonResponse(
      apiError("INTERNAL_ERROR", "Unable to resend verification code."),
      500,
      requestId,
    );
  }
}
