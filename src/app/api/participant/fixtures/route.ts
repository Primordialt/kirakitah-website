import { NextResponse } from "next/server";
import {
  listParticipantFixtureBundle,
  listParticipantFixtures,
  type FixtureScope,
} from "@/server/participant/participant-fixture-service";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

function parseScope(value: string | null): FixtureScope | "both" {
  if (value === "all" || value === "mine") return value;
  return "both";
}

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);

  try {
    const session = await requireParticipantApiSession(request);
    const url = new URL(request.url);
    const scope = parseScope(url.searchParams.get("scope"));

    if (scope === "both") {
      const bundle = await listParticipantFixtureBundle({
        accountId: session.user.id,
      });

      return NextResponse.json(
        {
          success: true,
          all: bundle.all,
          mine: bundle.mine,
          requestId,
        },
        {
          status: 200,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const fixtures = await listParticipantFixtures({
      accountId: session.user.id,
      scope,
    });

    return NextResponse.json(
      { success: true, scope, ...fixtures, requestId },
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
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to load fixtures."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
