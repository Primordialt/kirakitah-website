import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  assertParticipantCsrf,
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import {
  submitYouTubeSubscriptionAttestation,
  YouTubeSubscriptionAttestationError,
} from "@/server/participant/youtube-subscription-attestation";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

const bodySchema = z.object({
  youtubeChannel: z.string().max(200).optional(),
});

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

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "Invalid YouTube subscription attestation."),
        {
          status: 400,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const result = await submitYouTubeSubscriptionAttestation({
      accountId: session.user.id,
      tournamentId,
      youtubeChannel: parsed.data.youtubeChannel,
    });

    return NextResponse.json(
      {
        success: true,
        socialFollowStatus: result.socialFollowStatus,
        message:
          "YouTube subscription attestation recorded. Manual review is required before verification.",
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

    if (error instanceof YouTubeSubscriptionAttestationError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "RATE_LIMITED"
            ? 429
            : error.code === "ALREADY_VERIFIED"
              ? 409
              : 403;
      const apiCode =
        error.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : error.code === "RATE_LIMITED"
            ? "RATE_LIMITED"
            : error.code === "ALREADY_VERIFIED"
              ? "CONFLICT"
              : "FORBIDDEN";
      return NextResponse.json(apiError(apiCode, error.message), {
        status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }

    console.error("[participant/youtube-subscription]", error);
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to record YouTube subscription attestation."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
