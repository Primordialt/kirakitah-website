import { NextResponse } from "next/server";
import { getWalletSummary, listLedger, requestDeposit, requestWithdrawal } from "@/server/wallet/service";
import { isWalletError } from "@/server/wallet/errors";
import { walletErrorCode } from "@/server/arena/api-errors";
import { apiError } from "@/server/errors";
import {
  ParticipantAuthenticationError,
  requireParticipantApiSession,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import { getOrCreateRequestId, requestIdHeaders } from "@/server/security/request-id";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    const session = await requireParticipantApiSession(request);
    const [wallet, transactions] = await Promise.all([
      getWalletSummary(session.user.id),
      listLedger(session.user.id),
    ]);
    return NextResponse.json(
      {
        success: true,
        wallet,
        transactions,
        depositNotice:
          "USDT top-ups require verified payment provider integration. Requests stay pending until operations confirms.",
        requestId,
      },
      { status: 200, headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) } },
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(apiError("INTERNAL_ERROR", "Unable to load wallet."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    const session = await requireParticipantApiSession(request);
    const body = (await request.json()) as {
      action?: "deposit" | "withdraw";
      amountKk?: string;
      destinationHint?: string;
    };
    if (body.action === "deposit" && body.amountKk) {
      const result = await requestDeposit(session.user.id, body.amountKk);
      return NextResponse.json({ success: true, ...result, requestId }, {
        status: 201,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (body.action === "withdraw" && body.amountKk) {
      const result = await requestWithdrawal(
        session.user.id,
        body.amountKk,
        body.destinationHint,
      );
      return NextResponse.json({ success: true, ...result, requestId }, {
        status: 201,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(apiError("VALIDATION_ERROR", "Invalid wallet action."), {
      status: 400,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
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
    return NextResponse.json(apiError("INTERNAL_ERROR", "Wallet action failed."), {
      status: 500,
      headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
    });
  }
}
