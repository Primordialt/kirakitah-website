import {
  verifyPreRegistrationEmailChallenge,
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
  challengeId: z.string().uuid(),
  code: z.string().min(4).max(12),
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
      apiError("VALIDATION_ERROR", "Invalid verification request."),
      {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }

  try {
    const result = await verifyPreRegistrationEmailChallenge(parsed.data);
    return NextResponse.json(
      {
        success: true,
        emailVerificationToken: result.emailVerificationToken,
        expiresAt: result.expiresAt,
        message: "Email verified.",
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
        error.code === "VERIFICATION_EXHAUSTED" ||
        error.code === "VERIFICATION_RATE_LIMITED"
          ? 429
          : 400;
      return NextResponse.json(
        { ...apiError(error.code, error.message), requestId },
        {
          status,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to verify email."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
