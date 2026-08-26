import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  loginParticipant,
  ParticipantLoginError,
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
  identifier: z.string().min(1),
  password: z.string().min(1),
});

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

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
        apiError("VALIDATION_ERROR", "Invalid login request."),
        {
          status: 400,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const user = await loginParticipant({
      identifier: parsed.data.identifier,
      password: parsed.data.password,
      clientIp: getClientIp(request),
    });

    return NextResponse.json(
      {
        success: true,
        username: user.username,
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
    if (error instanceof ParticipantLoginError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.code === "RATE_LIMITED" ? 429 : 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Invalid email/username or password."),
      {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
