import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured, serverEnv } from "@/server/env";
import {
  ACCOUNT_EXISTS_MESSAGE,
  participantAccountExistsForEmail,
} from "@/server/participant/auth/register";
import {
  verifyPreRegistrationEmailChallenge,
  PreRegistrationEmailError,
} from "@/server/verification/email/pre-registration";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

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
        "Account registration is not configured for this environment.",
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
    if (await participantAccountExistsForEmail(parsed.data.email)) {
      return NextResponse.json(
        apiError("ACCOUNT_EXISTS", ACCOUNT_EXISTS_MESSAGE),
        {
          status: 409,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const result = await verifyPreRegistrationEmailChallenge(parsed.data);

    return NextResponse.json(
      {
        success: true,
        emailVerificationToken: result.emailVerificationToken,
        expiresAt: result.expiresAt,
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
        error.code === "VERIFICATION_RATE_LIMITED" ||
        error.code === "VERIFICATION_COOLDOWN"
          ? 429
          : error.code === "VERIFICATION_EXHAUSTED"
            ? 429
            : 400;
      return NextResponse.json(apiError(error.code, error.message), {
        status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
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
