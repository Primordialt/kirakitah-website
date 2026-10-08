import { NextResponse } from "next/server";
import { submitArenaResponse } from "@/server/arena/engine";
import { arenaErrorCode, walletErrorCode } from "@/server/arena/api-errors";
import { isArenaError } from "@/server/arena/errors";
import { isWalletError } from "@/server/wallet/errors";
import { apiError } from "@/server/errors";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import { getOrCreateRequestId, requestIdHeaders } from "@/server/security/request-id";
import { readArenaSubmission } from "@/server/arena/projections";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const requestId = getOrCreateRequestId(request);
  const { slug } = await context.params;
  try {
    const session = await requireParticipantApiSession(request);
    const body = (await request.json()) as {
      payload?: unknown;
      clientRequestId?: unknown;
      prizeMilli?: unknown;
      prizeKk?: unknown;
      poolMilli?: unknown;
      chargedEntries?: unknown;
      payoutMilli?: unknown;
    };
    const submission = readArenaSubmission(body);
    if (submission.payload === null) {
      return NextResponse.json(apiError("VALIDATION_ERROR", "Response payload required."), {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    const result = await submitArenaResponse({
      arenaSlug: slug,
      participantAccountId: session.user.id,
      payload: submission.payload,
      clientRequestId: submission.clientRequestId,
    });
    return NextResponse.json(
      { success: true, ...result, requestId },
      { status: 201, headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) } },
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (isWalletError(error)) {
      return NextResponse.json(apiError(walletErrorCode(error), error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (isArenaError(error)) {
      return NextResponse.json(apiError(arenaErrorCode(error), error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(apiError("INTERNAL_ERROR", "Unable to submit response."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
