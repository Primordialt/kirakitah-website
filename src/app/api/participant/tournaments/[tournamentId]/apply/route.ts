import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  ApplicationGateError,
  applyParticipantToTournament,
  assertParticipantCsrf,
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import {
  DuplicateRegistrationError,
  RateLimitError,
} from "@/server/registration/create-application";
import { RegistrationGateError } from "@/server/registration/registration-gate";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

const applySchema = z.object({
  game: z.string().min(1),
  platform: z.string().min(1),
  gamingProfile: z.string().max(500).optional(),
  timezone: z.string().min(1),
  availability: z.array(z.string().min(1)).min(1),
  socialHandles: z.record(z.string()).optional(),
  socialFollowAttestation: z.literal(true),
  consents: z.object({
    rules: z.literal(true),
    terms: z.literal(true),
    privacy: z.literal(true),
    codeOfConduct: z.literal(true),
    mediaConsent: z.literal(true),
  }),
});

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  const requestId = getOrCreateRequestId(request);
  const { tournamentId: rawTournamentId } = await context.params;
  const tournamentId = resolveTournamentId(rawTournamentId);

  if (!tournamentId) {
    return NextResponse.json(apiError("NOT_FOUND", "Tournament not found."), {
      status: 404,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }

  if (!isRegistrationBackendConfigured()) {
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

  try {
    assertParticipantCsrf(request);
    const session = await requireParticipantApiSession(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(apiError("VALIDATION_ERROR", "Invalid JSON body."), {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }

    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "Invalid tournament application."),
        {
          status: 400,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const result = await applyParticipantToTournament({
      accountId: session.user.id,
      tournamentId,
      body: parsed.data,
      clientIp: getClientIp(request),
      requestId,
    });

    return NextResponse.json(
      {
        success: true,
        referenceId: result.referenceId,
        status: result.status,
        contactVerification: result.contactVerification,
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
    if (error instanceof ApplicationGateError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (error instanceof RegistrationGateError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (error instanceof DuplicateRegistrationError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: 409,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(apiError("RATE_LIMITED", error.message), {
        status: 429,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to submit tournament application."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
