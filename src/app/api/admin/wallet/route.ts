import { NextResponse } from "next/server";
import { withAdminApi, adminJson } from "@/server/admin/http";
import { apiError } from "@/server/errors";
import { isWalletError } from "@/server/wallet/errors";
import { walletErrorCode } from "@/server/arena/api-errors";
import {
  applyWalletAdjustment,
  listAdminWalletOperations,
  reconcileWithdrawal,
  reviewWithdrawal,
} from "@/server/payments/nowpayments/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminApi(request, "wallet:finance", async (_session, requestId) => {
    const operations = await listAdminWalletOperations();
    return adminJson({ success: true, ...operations, requestId }, 200, requestId);
  });
}

export async function POST(request: Request) {
  return withAdminApi(request, "wallet:finance", async (session, requestId) => {
    try {
      const body = (await request.json()) as {
        action?: "reject" | "approve" | "adjust" | "refresh" | "reconcile";
        withdrawalId?: string;
        verificationCode?: string;
        providerPayoutId?: string;
        providerBatchId?: string;
        username?: string;
        amountKk?: string;
        direction?: "credit" | "debit";
        reason?: string;
        clientRequestId?: string;
      };
      if (
        (body.action === "reject" || body.action === "approve" || body.action === "refresh" || body.action === "reconcile") &&
        body.withdrawalId
      ) {
        if (body.action === "refresh" || body.action === "reconcile") {
          const result = await reconcileWithdrawal({
            withdrawalId: body.withdrawalId,
            actorId: session.user.id,
            actorRole: session.user.role,
            providerPayoutId: body.providerPayoutId,
            providerBatchId: body.providerBatchId,
          });
          return adminJson({ success: true, ...result, requestId }, 200, requestId);
        }
        const result = await reviewWithdrawal({
          withdrawalId: body.withdrawalId,
          action: body.action,
          verificationCode: body.verificationCode,
          actorId: session.user.id,
          actorRole: session.user.role,
        });
        return adminJson({ success: true, ...result, requestId }, 200, requestId);
      }
      if (body.action === "adjust" && body.username && body.amountKk && body.direction && body.reason && body.clientRequestId) {
        await applyWalletAdjustment({
          username: body.username,
          amountKk: body.amountKk,
          direction: body.direction,
          reason: body.reason,
          clientRequestId: body.clientRequestId,
          actorId: session.user.id,
          actorRole: session.user.role,
        });
        return adminJson({ success: true, requestId }, 200, requestId);
      }
      return adminJson(apiError("VALIDATION_ERROR", "Invalid wallet action."), 400, requestId);
    } catch (error) {
      if (isWalletError(error)) {
        return adminJson(apiError(walletErrorCode(error), error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Wallet action failed."), 500, requestId);
    }
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
