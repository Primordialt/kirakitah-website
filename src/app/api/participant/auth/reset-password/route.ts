import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
  ParticipantPasswordResetError,
  resetPasswordWithToken,
} from "@/server/participant";
import {
  assertParticipantCsrf,
  ParticipantAuthenticationError,
} from "@/server/participant/auth/session";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  if (!isRegistrationBackendConfigured()) {
    return NextResponse.json(
      apiError(
        "CONFIGURATION_UNAVAILABLE",
        "Participant authentication is not configured for this environment.",
      ),
      {
        status: 503,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }

  try {
    assertParticipantCsrf(request);

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
        apiError("VALIDATION_ERROR", PASSWORD_RESET_INVALID_TOKEN_MESSAGE),
        {
          status: 400,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    await resetPasswordWithToken({
      token: parsed.data.token,
      password: parsed.data.password,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your password has been updated. You can sign in now.",
        requestId,
      },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (error instanceof ParticipantPasswordResetError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.code === "CONFIGURATION_UNAVAILABLE" ? 503 : 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(
      apiError("VALIDATION_ERROR", PASSWORD_RESET_INVALID_TOKEN_MESSAGE),
      {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
