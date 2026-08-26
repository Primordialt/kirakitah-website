import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured, serverEnv } from "@/server/env";
import {
  ACCOUNT_EXISTS_MESSAGE,
  createParticipantAccount,
  ParticipantRegisterError,
  setParticipantSessionCookie,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { assertParticipantCsrf } from "@/server/participant/auth/session";
import { ParticipantAuthenticationError } from "@/server/participant/auth/session";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  emailVerificationToken: z.string().min(1),
  username: z.string().min(3).max(24),
  password: z.string().min(12),
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
        apiError("VALIDATION_ERROR", "Invalid registration request."),
        {
          status: 400,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const account = await createParticipantAccount(parsed.data);

    await setParticipantSessionCookie({
      id: account.accountId,
      email: account.email,
      username: account.username,
      active: true,
    });

    return NextResponse.json(
      {
        success: true,
        accountId: account.accountId,
        username: account.username,
        requestId,
      },
      {
        status: 201,
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
    if (error instanceof ParticipantRegisterError) {
      const status =
        error.code === "ACCOUNT_EXISTS" || error.code === "DUPLICATE_USERNAME"
          ? 409
          : error.code === "EMAIL_VERIFICATION_REQUIRED" ||
              error.code === "VERIFICATION_EXPIRED" ||
              error.code === "VERIFICATION_INVALID"
            ? 400
            : 400;
      return NextResponse.json(
        apiError(
          error.code === "ACCOUNT_EXISTS" ? "ACCOUNT_EXISTS" : error.code,
          error.code === "ACCOUNT_EXISTS" ? ACCOUNT_EXISTS_MESSAGE : error.message,
        ),
        {
          status,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to create account."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
