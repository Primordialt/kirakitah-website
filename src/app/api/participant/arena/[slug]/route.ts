import { NextResponse } from "next/server";
import { getArenaLiveState } from "@/server/arena/engine";
import { arenaErrorCode } from "@/server/arena/api-errors";
import { isArenaError } from "@/server/arena/errors";
import { apiError } from "@/server/errors";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { getWalletSummary } from "@/server/wallet/service";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import { getOrCreateRequestId, requestIdHeaders } from "@/server/security/request-id";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const requestId = getOrCreateRequestId(request);
  const { slug } = await context.params;
  try {
    const session = await requireParticipantApiSession(request);
    const [live, wallet] = await Promise.all([
      getArenaLiveState(slug, session.user.id),
      getWalletSummary(session.user.id),
    ]);
    return NextResponse.json(
      { success: true, ...live, wallet, requestId },
      { status: 200, headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) } },
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (isArenaError(error)) {
      return NextResponse.json(apiError(arenaErrorCode(error), error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(apiError("INTERNAL_ERROR", "Unable to load Arena."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
