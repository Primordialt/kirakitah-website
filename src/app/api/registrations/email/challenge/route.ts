import {
  initiatePreRegistrationEmailChallenge,
  PreRegistrationEmailError,
} from "@/server/verification/email/pre-registration";
import { isRegistrationBackendConfigured, serverEnv } from "@/server/env";
import { apiError } from "@/server/errors";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  eventId: z.string().min(1),
  recipientFirstName: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  if (!isRegistrationBackendConfigured() || !serverEnv.registrationPiiEncryptionKey) {
    return NextResponse.json(
      apiError(
        "CONFIGURATION_UNAVAILABLE",
        "Registration backend is not configured for this environment.",
      ),
      {
        status: 503,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Invalid JSON body."), {
      status: 400,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Enter a valid email address."),
      {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }

  try {
    const result = await initiatePreRegistrationEmailChallenge(parsed.data);
    return NextResponse.json(
      {
        success: true,
        challengeId: result.challengeId,
        resendAvailableAt: result.resendAvailableAt,
        message: "Verification email sent.",
        requestId,
      },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch (error) {
    if (error instanceof PreRegistrationEmailError) {
      const status =
        error.code === "DUPLICATE_EMAIL"
          ? 409
          : error.code === "VERIFICATION_COOLDOWN" ||
              error.code === "VERIFICATION_RATE_LIMITED"
            ? 429
            : error.code === "PROVIDER_UNAVAILABLE"
              ? 503
              : 400;
      return NextResponse.json(
        {
          ...apiError(error.code, error.message),
          ...(error.resendAvailableAt
            ? { resendAvailableAt: error.resendAvailableAt }
            : {}),
          requestId,
        },
        {
          status,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to send verification email."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
