import { NextResponse } from "next/server";
import { getWalletSummary, listLedger } from "@/server/wallet/service";
import {
  createUsdtDeposit,
  createUsdtWithdrawal,
  DEPOSIT_CREDIT_POLICY,
  listParticipantPayments,
  refreshUsdtDeposit,
} from "@/server/payments/nowpayments/service";
import { readNowPaymentsConfig } from "@/server/payments/nowpayments/config";
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

function json(body: unknown, status: number, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
  });
}

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    const session = await requireParticipantApiSession(request);
    const config = readNowPaymentsConfig();
    const [wallet, transactions, payments] = await Promise.all([
      getWalletSummary(session.user.id),
      listLedger(session.user.id),
      listParticipantPayments(session.user.id),
    ]);
    return json(
      {
        success: true,
        wallet,
        transactions,
        deposits: payments.deposits,
        withdrawals: payments.withdrawals,
        depositsEnabled: config.depositsEnabled,
        payoutsEnabled: config.payoutsEnabled,
        network: "USDT TRC20",
        creditPolicy: DEPOSIT_CREDIT_POLICY,
        requestId,
      },
      200,
      requestId,
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return json(apiError("UNAUTHORIZED", error.message), 401, requestId);
    }
    return json(apiError("INTERNAL_ERROR", "Unable to load wallet."), 500, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  try {
    const session = await requireParticipantApiSession(request);
    const body = (await request.json()) as {
      action?: string;
      amountKk?: string;
      destinationAddress?: string;
      confirmedDestination?: boolean;
      clientRequestId?: string;
      depositId?: string;
      accountId?: string;
      creditedMilli?: number;
      status?: string;
    };
    if (body.action === "deposit" && body.amountKk) {
      const result = await createUsdtDeposit(session.user.id, body.amountKk);
      return json({ success: true, ...result, requestId }, 201, requestId);
    }
    if (body.action === "withdraw" && body.amountKk && body.destinationAddress && body.clientRequestId) {
      const result = await createUsdtWithdrawal(session.user.id, {
        amountKk: body.amountKk,
        destinationAddress: body.destinationAddress,
        confirmedDestination: body.confirmedDestination === true,
        clientRequestId: body.clientRequestId,
      });
      return json({ success: true, ...result, requestId }, 201, requestId);
    }
    if (body.action === "refresh" && body.depositId) {
      const result = await refreshUsdtDeposit(session.user.id, body.depositId);
      return json({ success: true, ...result, requestId }, 200, requestId);
    }
    return json(apiError("VALIDATION_ERROR", "Invalid wallet action."), 400, requestId);
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return json(apiError("UNAUTHORIZED", error.message), 401, requestId);
    }
    if (isWalletError(error)) {
      return json(apiError(walletErrorCode(error), error.message), error.status, requestId);
    }
    return json(apiError("INTERNAL_ERROR", "Wallet action failed."), 500, requestId);
  }
}
