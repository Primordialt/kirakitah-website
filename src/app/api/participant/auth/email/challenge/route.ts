import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured, serverEnv } from "@/server/env";
import {
  ACCOUNT_EXISTS_MESSAGE,
  participantAccountExistsForEmail,
} from "@/server/participant/auth/register";
import { PARTICIPANT_ACCOUNT_EMAIL_CHALLENGE_EVENT_ID } from "@/server/participant/auth/constants";
import {
  initiatePreRegistrationEmailChallenge,
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
  recipientFirstName: z.string().max(40).optional(),
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
      apiError("VALIDATION_ERROR", "Enter a valid email address."),
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

    const result = await initiatePreRegistrationEmailChallenge({
      email: parsed.data.email,
      eventId: PARTICIPANT_ACCOUNT_EMAIL_CHALLENGE_EVENT_ID,
      recipientFirstName: parsed.data.recipientFirstName,
    });

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
        error.code === "DUPLICATE_EMAIL" || error.code === "ACCOUNT_EXISTS"
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
