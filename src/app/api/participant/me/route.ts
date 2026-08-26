import { NextResponse } from "next/server";
import { apiError } from "@/server/errors";
import {
  getAccountWithProfile,
  ParticipantAuthenticationError,
  ParticipantProfileError,
  requireParticipantApiSession,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);

  try {
    const session = await requireParticipantApiSession(request);
    const data = await getAccountWithProfile(session.user.id);

    return NextResponse.json(
      {
        success: true,
        account: {
          id: data.account.id,
          email: data.account.email,
          username: data.account.username,
          emailVerifiedAt: data.account.emailVerifiedAt,
        },
        profile: data.profile,
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
    if (error instanceof ParticipantProfileError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to load account."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
