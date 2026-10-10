import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getDb, type Db } from "@/server/db";
import {
  kkPaymentEvents,
  kkWalletDeposits,
  kkWalletLedger,
  kkWallets,
  kkWalletWithdrawals,
  participantAccounts,
} from "@/server/db/schema";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import { createNowPaymentsClient, NowPaymentsProviderError, type NowPaymentsClient } from "@/server/payments/nowpayments/client";
import { readNowPaymentsConfig, type NowPaymentsConfig } from "@/server/payments/nowpayments/config";
import { milliToUsdtDecimal } from "@/server/payments/nowpayments/amounts";
import {
  decideCreditedDepositFollowUp,
  decideDepositCredit,
  decidePayoutUpdate,
  depositCreditIdempotencyKey,
  depositMeetsMinimum,
  depositReversalIdempotencyKey,
  NOWPAYMENTS_NETWORK_LABEL,
  NOWPAYMENTS_PAY_CURRENCY,
  shouldApplyPaymentStatus,
  withdrawalFinalizeIdempotencyKey,
  type ObservedPayment,
} from "@/server/payments/nowpayments/policy";
import { ipnEventKey, verifyIpnSignature } from "@/server/payments/nowpayments/signature";
import { WalletError } from "@/server/wallet/errors";
import { canSpend, milliToKkDisplay, parseKkInput } from "@/server/wallet/money";
import { getOrCreateWallet } from "@/server/wallet/service";

const DEPOSIT_WINDOW_MS = 10 * 60 * 1000;
const DEPOSIT_LIMIT = 5;
const recentActions = new Map<string, number[]>();

export const DEPOSIT_CREDIT_POLICY =
  "1 settled USDT equals 1 KK. The amount you enter is priced in USD and is not the on-chain amount. KK is credited only after NOWPayments reports the payment finished, both the paid asset and the settled balance currency are USDT TRC20, and the USDT credited to KIRAKITAH matches the requested amount exactly. A smaller or larger settled amount, a repeated deposit, or a different asset is held for review and is not credited automatically. Provider and network fees are whatever NOWPayments includes in the amount it tells you to send. Returning to this page does not confirm a payment.";

const OPEN_WITHDRAWAL_STATES = ["pending_review", "approved", "processing"] as const;

const PUBLIC_DEPOSIT_REVIEW: Record<string, string> = {
  underpayment: "The settled USDT was less than the requested amount and is waiting for review.",
  overpayment: "The settled USDT was more than the requested amount and is waiting for review.",
  wrong_currency: "The payment was not USDT TRC20 and is waiting for review.",
  order_mismatch: "The payment did not match this deposit and is waiting for review.",
  payment_mismatch: "The payment did not match this deposit and is waiting for review.",
  repeated_deposit: "A repeated deposit is waiting for review.",
  missing_outcome: "The provider did not report the settled USDT amount. This deposit is waiting for review.",
  not_finished: "The payment is not finished and is waiting for review.",
  reconciliation_mismatch: "The payment could not be confirmed and is waiting for review.",
  post_credit_refund_shortfall: "A refund was reported after KK was credited. Recovery is waiting for review.",
  reversed: "The credited deposit was refunded and the KK was removed.",
  post_credit_status_change: "The provider changed this payment after it was credited. It is waiting for review.",
  unmatched_payment: "Another payment was reported for this deposit and is waiting for review.",
  amount_out_of_range: "The amount could not be credited safely and is waiting for review.",
};

export function publicDepositReview(reason: string | null): string | null {
  if (!reason) return null;
  return PUBLIC_DEPOSIT_REVIEW[reason] ?? "This deposit is waiting for review.";
}

export function publicWithdrawalNote(reason: string | null): string | null {
  if (!reason) return null;
  if (reason === "Rejected by super admin") return "The withdrawal was rejected and the KK hold was released.";
  if (reason === "REJECTED" || reason === "REJECTED_NOT_CHECKED") {
    return "The payout was rejected and the KK hold was released.";
  }
  return "This withdrawal needs review.";
}

function assertSuperAdmin(actorRole: AdminRole) {
  if (actorRole !== "SUPER_ADMIN") {
    throw new WalletError("Only a super admin can perform this wallet action.", "FORBIDDEN", 403);
  }
}

function assertRateLimit(key: string) {
  const now = Date.now();
  const recent = (recentActions.get(key) ?? []).filter((at) => now - at < DEPOSIT_WINDOW_MS);
  if (recent.length >= DEPOSIT_LIMIT) {
    throw new WalletError("Too many wallet requests. Try again later.", "RATE_LIMITED", 429);
  }
  recent.push(now);
  recentActions.set(key, recent);
}

export function resetWalletProviderRateLimitForTests() {
  recentActions.clear();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; cause?: unknown };
  if (candidate.code === "23505") return true;
  if (typeof candidate.message === "string" && candidate.message.includes("23505")) return true;
  return candidate.cause ? isUniqueViolation(candidate.cause) : false;
}

function providerFailure(error: unknown): never {
  if (error instanceof NowPaymentsProviderError) {
    throw new WalletError(error.message, "CONFIGURATION_UNAVAILABLE", 503);
  }
  throw error;
}

async function requireActiveAccount(participantAccountId: string) {
  const db = getDb();
  const [account] = await db
    .select({
      id: participantAccounts.id,
      active: participantAccounts.active,
      emailVerifiedAt: participantAccounts.emailVerifiedAt,
      username: participantAccounts.username,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, participantAccountId))
    .limit(1);
  if (!account || !account.active) {
    throw new WalletError("Account is not available for wallet transfers.", "FORBIDDEN", 403);
  }
  if (!account.emailVerifiedAt) {
    throw new WalletError("Verify your email before moving USDT.", "FORBIDDEN", 403);
  }
  return account;
}

function clientFor(config: NowPaymentsConfig, client?: NowPaymentsClient): NowPaymentsClient {
  if (client) return client;
  return createNowPaymentsClient(config, async (input) => {
    const response = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body,
    });
    return { status: response.status, raw: await response.text() };
  });
}

function observedFrom(payment: {
  paymentId: string;
  orderId: string | null;
  paymentStatus: string;
  payCurrency: string | null;
  payAmount: string | null;
  actuallyPaid: string | null;
  outcomeAmount: string | null;
  outcomeCurrency: string | null;
  parentPaymentId: string | null;
  priceCurrency: string | null;
}): ObservedPayment {
  return payment;
}

export async function createUsdtDeposit(
  participantAccountId: string,
  amountKkInput: string,
  deps?: { config?: NowPaymentsConfig; client?: NowPaymentsClient },
) {
  const config = deps?.config ?? readNowPaymentsConfig();
  if (!config.depositsEnabled) {
    throw new WalletError(
      "USDT deposits are not active yet. NOWPayments must be configured with an API key, IPN secret, and HTTPS callback before real deposits open.",
      "CONFIGURATION_UNAVAILABLE",
      503,
    );
  }
  assertRateLimit(`deposit:${participantAccountId}`);
  await requireActiveAccount(participantAccountId);
  const amountMilli = parseKkInput(amountKkInput);
  const priceAmount = milliToUsdtDecimal(amountMilli);
  const nowpayments = clientFor(config, deps?.client);
  let minimum: { minAmount: string | null; fiatEquivalent: string | null };
  let estimatedPayAmount: string | null = null;
  try {
    minimum = await nowpayments.getMinimumPaymentAmount();
    estimatedPayAmount = (await nowpayments.getEstimate(priceAmount)).estimatedAmount;
  } catch (error) {
    providerFailure(error);
  }
  const meetsMinimum = depositMeetsMinimum(estimatedPayAmount, minimum!.minAmount);
  if (meetsMinimum === null) {
    throw new WalletError(
      "NOWPayments did not return a USDT TRC20 estimate for the minimum check.",
      "CONFIGURATION_UNAVAILABLE",
      503,
    );
  }
  if (!meetsMinimum) {
    const fiat = minimum!.fiatEquivalent ? ` (about ${minimum!.fiatEquivalent} USD)` : "";
    throw new WalletError(
      `NOWPayments minimum for this USDT TRC20 pair is ${minimum!.minAmount} ${NOWPAYMENTS_PAY_CURRENCY}${fiat}.`,
      "VALIDATION_ERROR",
      400,
    );
  }

  const wallet = await getOrCreateWallet(participantAccountId);
  const db = getDb();
  const orderId = `kk-${randomUUID()}`;
  const [deposit] = await db
    .insert(kkWalletDeposits)
    .values({
      walletId: wallet.id,
      amountMilli,
      status: "pending",
      provider: "nowpayments",
      orderId,
      priceAmountText: priceAmount,
      network: NOWPAYMENTS_NETWORK_LABEL,
      providerStatus: "creating",
    })
    .returning();

  try {
    const payment = await nowpayments.createPayment({
      priceAmount,
      orderId,
      description: "KIRAKITAH KK PTS deposit",
    });
    await db
      .update(kkWalletDeposits)
      .set({
        providerPaymentId: payment.paymentId,
        externalReference: payment.paymentId,
        payAddress: payment.payAddress,
        payAmountText: payment.payAmount,
        payCurrency: payment.payCurrency,
        providerStatus: payment.paymentStatus,
        priceAmountText: payment.priceAmount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(kkWalletDeposits.id, deposit!.id));
    if (payment.payCurrency.toLowerCase() !== NOWPAYMENTS_PAY_CURRENCY) {
      await db
        .update(kkWalletDeposits)
        .set({
          status: "processing",
          reviewReason: "wrong_currency",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(kkWalletDeposits.id, deposit!.id));
      throw new WalletError(
        "NOWPayments returned an unexpected payment currency.",
        "CONFIGURATION_UNAVAILABLE",
        502,
      );
    }
    return {
      depositId: deposit!.id,
      orderId,
      status: "pending" as const,
      providerStatus: payment.paymentStatus,
      payAddress: payment.payAddress,
      payAmount: payment.payAmount,
      payCurrency: payment.payCurrency,
      network: NOWPAYMENTS_NETWORK_LABEL,
      minimumAmount: minimum!.minAmount,
      amountKk: milliToKkDisplay(amountMilli),
      message: DEPOSIT_CREDIT_POLICY,
    };
  } catch (error) {
    const [saved] = await db
      .select({ providerPaymentId: kkWalletDeposits.providerPaymentId })
      .from(kkWalletDeposits)
      .where(eq(kkWalletDeposits.id, deposit!.id))
      .limit(1);
    if (!saved?.providerPaymentId) {
      await db
        .update(kkWalletDeposits)
        .set({ status: "failed", providerStatus: "create_failed", updatedAt: new Date().toISOString() })
        .where(eq(kkWalletDeposits.id, deposit!.id));
    }
    if (error instanceof WalletError) throw error;
    providerFailure(error);
  }
}

export async function listParticipantPayments(participantAccountId: string) {
  const wallet = await getOrCreateWallet(participantAccountId);
  const db = getDb();
  const deposits = await db
    .select({
      id: kkWalletDeposits.id,
      amountMilli: kkWalletDeposits.amountMilli,
      status: kkWalletDeposits.status,
      providerStatus: kkWalletDeposits.providerStatus,
      payAddress: kkWalletDeposits.payAddress,
      payAmountText: kkWalletDeposits.payAmountText,
      payCurrency: kkWalletDeposits.payCurrency,
      network: kkWalletDeposits.network,
      reviewReason: kkWalletDeposits.reviewReason,
      creditedMilli: kkWalletDeposits.creditedMilli,
      createdAt: kkWalletDeposits.createdAt,
    })
    .from(kkWalletDeposits)
    .where(eq(kkWalletDeposits.walletId, wallet.id))
    .orderBy(desc(kkWalletDeposits.createdAt))
    .limit(20);
  const withdrawals = await db
    .select({
      id: kkWalletWithdrawals.id,
      amountMilli: kkWalletWithdrawals.amountMilli,
      status: kkWalletWithdrawals.status,
      reviewState: kkWalletWithdrawals.reviewState,
      destinationAddress: kkWalletWithdrawals.destinationAddress,
      network: kkWalletWithdrawals.network,
      providerStatus: kkWalletWithdrawals.providerStatus,
      providerFeeText: kkWalletWithdrawals.providerFeeText,
      failureReason: kkWalletWithdrawals.failureReason,
      createdAt: kkWalletWithdrawals.createdAt,
    })
    .from(kkWalletWithdrawals)
    .where(eq(kkWalletWithdrawals.walletId, wallet.id))
    .orderBy(desc(kkWalletWithdrawals.createdAt))
    .limit(20);
  return {
    deposits: deposits.map((row) => ({
      id: row.id,
      amountMilli: row.amountMilli,
      status: row.status,
      providerStatus: row.providerStatus,
      payAddress: row.payAddress,
      payAmountText: row.payAmountText,
      payCurrency: row.payCurrency,
      network: row.network,
      reviewReason: publicDepositReview(row.reviewReason),
      createdAt: row.createdAt,
      amountKk: milliToKkDisplay(row.amountMilli),
      creditedKk: row.creditedMilli == null ? null : milliToKkDisplay(row.creditedMilli),
    })),
    withdrawals: withdrawals.map((row) => ({
      id: row.id,
      amountMilli: row.amountMilli,
      status: row.status,
      reviewState: row.reviewState,
      destinationAddress: row.destinationAddress,
      network: row.network,
      providerStatus: row.providerStatus,
      providerFeeText: row.providerFeeText,
      failureReason: publicWithdrawalNote(row.failureReason),
      createdAt: row.createdAt,
      amountKk: milliToKkDisplay(row.amountMilli),
    })),
  };
}

async function clawRefundShortfall(tx: Db, walletId: string): Promise<number> {
  const deposits = await tx
    .select()
    .from(kkWalletDeposits)
    .where(and(eq(kkWalletDeposits.walletId, walletId), eq(kkWalletDeposits.reviewReason, "post_credit_refund_shortfall")))
    .for("update");
  let clawedTotal = 0;
  for (const deposit of deposits) {
    if (!deposit.creditedMilli || deposit.creditedMilli <= 0 || !deposit.providerPaymentId) continue;
    const prior = await tx
      .select({ amountMilli: kkWalletLedger.amountMilli })
      .from(kkWalletLedger)
      .where(
        and(
          eq(kkWalletLedger.referenceId, deposit.id),
          eq(kkWalletLedger.referenceType, "kk_wallet_deposit"),
          eq(kkWalletLedger.entryType, "refund"),
        ),
      );
    const clawed = prior.reduce((sum, row) => sum + Math.abs(row.amountMilli), 0);
    const owed = deposit.creditedMilli - clawed;
    if (owed <= 0) continue;
    const [wallet] = await tx.select().from(kkWallets).where(eq(kkWallets.id, walletId)).limit(1).for("update");
    if (!wallet || !Number.isSafeInteger(wallet.balanceMilli) || !Number.isSafeInteger(wallet.reservedMilli)) continue;
    const available = wallet.balanceMilli - wallet.reservedMilli;
    const claw = Math.min(Math.max(available, 0), owed);
    if (claw <= 0) continue;
    clawedTotal += claw;
    const now = new Date().toISOString();
    const [updated] = await tx
      .update(kkWallets)
      .set({ balanceMilli: sql`${kkWallets.balanceMilli} - ${claw}`, updatedAt: now })
      .where(
        and(
          eq(kkWallets.id, wallet.id),
          sql`${kkWallets.balanceMilli} - ${kkWallets.reservedMilli} >= ${claw}`,
        ),
      )
      .returning({ balanceMilli: kkWallets.balanceMilli });
    if (!updated) throw new Error("Deposit refund clawback lost a balance race");
    const [ledger] = await tx
      .insert(kkWalletLedger)
      .values({
        walletId: wallet.id,
        entryType: "refund",
        amountMilli: -claw,
        balanceBeforeMilli: updated.balanceMilli + claw,
        balanceAfterMilli: updated.balanceMilli,
        idempotencyKey: depositReversalIdempotencyKey(deposit.providerPaymentId, clawed),
        referenceType: "kk_wallet_deposit",
        referenceId: deposit.id,
        description: `USDT deposit refund clawback (${milliToKkDisplay(claw)} KK)`,
        metadata: { providerPaymentId: deposit.providerPaymentId, shortfallMilli: owed - claw },
      })
      .onConflictDoNothing()
      .returning({ id: kkWalletLedger.id });
    if (!ledger) throw new Error("Deposit refund clawback ledger conflict");
    const remaining = owed - claw;
    await tx
      .update(kkWalletDeposits)
      .set({
        reviewReason: remaining > 0 ? "post_credit_refund_shortfall" : "reversed",
        status: remaining > 0 ? "processing" : "failed",
        providerStatus: "refunded",
        updatedAt: now,
      })
      .where(eq(kkWalletDeposits.id, deposit.id));
  }
  return clawedTotal;
}

async function applyObservedDeposit(depositId: string, observed: ObservedPayment, reconciled: ObservedPayment | null) {
  const db = getDb();
  const [deposit] = await db.select().from(kkWalletDeposits).where(eq(kkWalletDeposits.id, depositId)).limit(1);
  if (!deposit || !deposit.orderId || !deposit.providerPaymentId) return;
  if (deposit.ledgerEntryId || deposit.status === "completed") {
    const followUp = decideCreditedDepositFollowUp({
      expectedPaymentId: deposit.providerPaymentId,
      observed,
      reconciled,
    });
    if (followUp.kind === "reverse") {
      const changed = await db.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(kkWalletDeposits)
          .where(eq(kkWalletDeposits.id, deposit.id))
          .limit(1)
          .for("update");
        if (!locked || locked.reviewReason === "reversed") return false;
        const flagged = locked.reviewReason !== "post_credit_refund_shortfall";
        if (flagged) {
          await tx
            .update(kkWalletDeposits)
            .set({
              providerStatus: "refunded",
              reviewReason: "post_credit_refund_shortfall",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(kkWalletDeposits.id, locked.id));
        }
        const clawed = await clawRefundShortfall(tx as unknown as Db, locked.walletId);
        return flagged || clawed > 0;
      });
      if (!changed) return;
      const [wallet] = await db
        .select({ participantAccountId: kkWallets.participantAccountId })
        .from(kkWallets)
        .where(eq(kkWallets.id, deposit.walletId))
        .limit(1);
      if (wallet) await notifyDepositOutcome(wallet.participantAccountId, false);
      await recordAdminAuditEvent({
        eventType: "ARENA_WALLET_ADJUSTMENT",
        metadata: { action: "deposit_refund", depositId: deposit.id, providerPaymentId: deposit.providerPaymentId },
      });
    } else if (followUp.kind === "exception" && deposit.reviewReason == null) {
      await db
        .update(kkWalletDeposits)
        .set({ reviewReason: followUp.reason, providerStatus: observed.paymentStatus, updatedAt: new Date().toISOString() })
        .where(and(eq(kkWalletDeposits.id, deposit.id), isNull(kkWalletDeposits.reviewReason)));
    }
    return;
  }
  const decision = decideDepositCredit({
    currentStatus: deposit.providerStatus,
    expected: {
      orderId: deposit.orderId,
      providerPaymentId: deposit.providerPaymentId,
      requestedMilli: deposit.amountMilli,
    },
    observed,
    reconciled,
  });
  if (decision.kind === "ignore_regression") return;

  let appliedCredit = decision.kind === "credit";
  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(kkWalletDeposits)
      .where(eq(kkWalletDeposits.id, depositId))
      .limit(1)
      .for("update");
    if (!locked || locked.status === "completed" || locked.ledgerEntryId) {
      appliedCredit = false;
      return;
    }
    if (!shouldApplyPaymentStatus(locked.providerStatus, observed.paymentStatus) && decision.kind !== "credit") {
      appliedCredit = false;
      return;
    }
    const now = new Date().toISOString();
    if (decision.kind === "credit") {
      const [wallet] = await tx.select().from(kkWallets).where(eq(kkWallets.id, locked.walletId)).limit(1).for("update");
      if (!wallet || !Number.isSafeInteger(wallet.balanceMilli) || wallet.balanceMilli > Number.MAX_SAFE_INTEGER - decision.creditMilli) {
        appliedCredit = false;
        await tx
          .update(kkWalletDeposits)
          .set({ status: "processing", reviewReason: "amount_out_of_range", providerStatus: observed.paymentStatus, updatedAt: now })
          .where(eq(kkWalletDeposits.id, locked.id));
        return;
      }
      const idempotencyKey = depositCreditIdempotencyKey(locked.providerPaymentId!);
      const [existing] = await tx
        .select({ id: kkWalletLedger.id })
        .from(kkWalletLedger)
        .where(eq(kkWalletLedger.idempotencyKey, idempotencyKey))
        .limit(1);
      let ledgerId = existing?.id ?? null;
      if (!ledgerId) {
        const [updated] = await tx
          .update(kkWallets)
          .set({
            balanceMilli: sql`${kkWallets.balanceMilli} + ${decision.creditMilli}`,
            updatedAt: now,
          })
          .where(eq(kkWallets.id, wallet.id))
          .returning({ balanceMilli: kkWallets.balanceMilli });
        if (!updated || !Number.isSafeInteger(updated.balanceMilli)) {
          throw new Error("Deposit credit balance is outside the safe integer range");
        }
        const balanceAfter = updated.balanceMilli;
        const [ledger] = await tx
          .insert(kkWalletLedger)
          .values({
            walletId: wallet.id,
            entryType: "deposit",
            amountMilli: decision.creditMilli,
            balanceBeforeMilli: balanceAfter - decision.creditMilli,
            balanceAfterMilli: balanceAfter,
            idempotencyKey,
            referenceType: "kk_wallet_deposit",
            referenceId: locked.id,
            description: `USDT TRC20 deposit credited (${milliToKkDisplay(decision.creditMilli)} KK)`,
          })
          .onConflictDoNothing()
          .returning({ id: kkWalletLedger.id });
        if (!ledger) throw new Error("Deposit credit ledger conflict");
        ledgerId = ledger.id;
      }
      await tx
        .update(kkWalletDeposits)
        .set({
          status: "completed",
          providerStatus: observed.paymentStatus,
          actuallyPaidText: observed.actuallyPaid,
          outcomeAmountText: observed.outcomeAmount,
          outcomeCurrency: observed.outcomeCurrency,
          parentPaymentId: observed.parentPaymentId,
          creditedMilli: decision.creditMilli,
          ledgerEntryId: ledgerId,
          reviewReason: null,
          updatedAt: now,
        })
        .where(eq(kkWalletDeposits.id, locked.id));
      return;
    }
    appliedCredit = false;
    const status =
      observed.paymentStatus === "failed" || observed.paymentStatus === "refunded"
        ? "failed"
        : observed.paymentStatus === "expired"
          ? "cancelled"
          : decision.kind === "review"
            ? "processing"
            : "pending";
    await tx
      .update(kkWalletDeposits)
      .set({
        status,
        providerStatus: observed.paymentStatus,
        actuallyPaidText: observed.actuallyPaid,
        outcomeAmountText: observed.outcomeAmount,
        outcomeCurrency: observed.outcomeCurrency,
        parentPaymentId: observed.parentPaymentId,
        reviewReason: decision.kind === "review" ? decision.reason : null,
        updatedAt: now,
      })
      .where(eq(kkWalletDeposits.id, locked.id));
  });
  if (appliedCredit || decision.kind === "review") {
    const [wallet] = await db
      .select({ participantAccountId: kkWallets.participantAccountId })
      .from(kkWallets)
      .where(eq(kkWallets.id, deposit.walletId))
      .limit(1);
    if (wallet) await notifyDepositOutcome(wallet.participantAccountId, appliedCredit);
  }
}

export async function refreshUsdtDeposit(
  participantAccountId: string,
  depositId: string,
  deps?: { config?: NowPaymentsConfig; client?: NowPaymentsClient },
) {
  const config = deps?.config ?? readNowPaymentsConfig();
  const wallet = await getOrCreateWallet(participantAccountId);
  const db = getDb();
  const [deposit] = await db
    .select()
    .from(kkWalletDeposits)
    .where(and(eq(kkWalletDeposits.id, depositId), eq(kkWalletDeposits.walletId, wallet.id)))
    .limit(1);
  if (!deposit?.providerPaymentId) {
    throw new WalletError("Deposit not found.", "NOT_FOUND", 404);
  }
  const nowpayments = clientFor(config, deps?.client);
  let payment;
  try {
    payment = await nowpayments.getPayment(deposit.providerPaymentId);
  } catch (error) {
    providerFailure(error);
  }
  const observed = observedFrom(payment!);
  await applyObservedDeposit(deposit.id, observed, observed);
  return { depositId: deposit.id, providerStatus: observed.paymentStatus };
}

export async function createUsdtWithdrawal(
  participantAccountId: string,
  input: {
    amountKk: string;
    destinationAddress: string;
    confirmedDestination: boolean;
    clientRequestId: string;
  },
  deps?: { config?: NowPaymentsConfig; client?: NowPaymentsClient },
) {
  const config = deps?.config ?? readNowPaymentsConfig();
  if (!config.apiKey) {
    throw new WalletError(
      "USDT withdrawals are not active yet. Payouts also need NOWPayments IP whitelist, address whitelist, and 2FA before a transfer can be sent.",
      "CONFIGURATION_UNAVAILABLE",
      503,
    );
  }
  if (!input.confirmedDestination) {
    throw new WalletError("Confirm the destination address before requesting a withdrawal.", "VALIDATION_ERROR", 400);
  }
  const address = input.destinationAddress.trim();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    throw new WalletError("Enter a USDT TRC20 address.", "VALIDATION_ERROR", 400);
  }
  if (!input.clientRequestId || input.clientRequestId.length > 80) {
    throw new WalletError("A withdrawal request id is required.", "VALIDATION_ERROR", 400);
  }
  assertRateLimit(`withdraw:${participantAccountId}`);
  await requireActiveAccount(participantAccountId);
  const amountMilli = parseKkInput(input.amountKk);
  const amountDecimal = milliToUsdtDecimal(amountMilli);
  const nowpayments = clientFor(config, deps?.client);
  let fee: string | null = null;
  try {
    await nowpayments.validatePayoutAddress(address);
    fee = (await nowpayments.getPayoutFee(amountDecimal)).fee;
  } catch (error) {
    providerFailure(error);
  }

  const wallet = await getOrCreateWallet(participantAccountId);
  const db = getDb();
  const idempotencyKey = `withdraw:${participantAccountId}:${input.clientRequestId}`;
  const [existing] = await db
    .select()
    .from(kkWalletWithdrawals)
    .where(eq(kkWalletWithdrawals.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing) {
    return {
      withdrawalId: existing.id,
      status: existing.reviewState,
      amountKk: milliToKkDisplay(existing.amountMilli),
      duplicate: true,
      message: "This withdrawal request was already recorded.",
    };
  }
  if (!canSpend(wallet.balanceMilli, wallet.reservedMilli, amountMilli)) {
    throw new WalletError("Insufficient available KK PTS for withdrawal.", "INSUFFICIENT_BALANCE", 402);
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(kkWallets).where(eq(kkWallets.id, wallet.id)).limit(1).for("update");
      if (!locked || !canSpend(locked.balanceMilli, locked.reservedMilli, amountMilli)) {
        throw new WalletError("Insufficient available KK PTS for withdrawal.", "INSUFFICIENT_BALANCE", 402);
      }
      const [reserved] = await tx
        .update(kkWallets)
        .set({
          reservedMilli: sql`${kkWallets.reservedMilli} + ${amountMilli}`,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(kkWallets.id, locked.id),
            sql`${kkWallets.balanceMilli} - ${kkWallets.reservedMilli} >= ${amountMilli}`,
          ),
        )
        .returning({ reservedMilli: kkWallets.reservedMilli });
      if (!reserved) {
        throw new WalletError("Insufficient available KK PTS for withdrawal.", "INSUFFICIENT_BALANCE", 402);
      }
      const [row] = await tx
        .insert(kkWalletWithdrawals)
        .values({
          walletId: locked.id,
          amountMilli,
          status: "pending",
          reviewState: "pending_review",
          destinationHint: `${address.slice(0, 4)}…${address.slice(-4)}`,
          destinationAddress: address,
          network: NOWPAYMENTS_NETWORK_LABEL,
          reservedMilli: amountMilli,
          idempotencyKey,
          providerFeeText: fee,
          providerStatus: config.payoutsEnabled ? "awaiting_approval" : "payouts_disabled",
        })
        .returning();
      return row!;
    });
    return {
      withdrawalId: created.id,
      status: "pending_review" as const,
      amountKk: milliToKkDisplay(amountMilli),
      fee,
      payoutsEnabled: config.payoutsEnabled,
      duplicate: false,
      message: config.payoutsEnabled
        ? "Withdrawal reserved and waiting for review. KK stays on hold until the payout is finished or rejected."
        : "Withdrawal reserved for review. NOWPayments payouts stay disabled until IP whitelist, address whitelist, and 2FA are confirmed. No USDT has been sent.",
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const [row] = await db
        .select()
        .from(kkWalletWithdrawals)
        .where(eq(kkWalletWithdrawals.idempotencyKey, idempotencyKey))
        .limit(1);
      if (row) {
        return {
          withdrawalId: row.id,
          status: row.reviewState,
          amountKk: milliToKkDisplay(row.amountMilli),
          duplicate: true,
          message: "This withdrawal request was already recorded.",
        };
      }
    }
    throw error;
  }
}

async function releaseReservation(withdrawalId: string, reviewState: "rejected" | "failed", reason: string) {
  const db = getDb();
  const accountId = await db.transaction(async (tx): Promise<string | null> => {
    const [row] = await tx
      .select()
      .from(kkWalletWithdrawals)
      .where(eq(kkWalletWithdrawals.id, withdrawalId))
      .limit(1)
      .for("update");
    if (!row || row.reviewState === "completed" || row.reviewState === "rejected" || row.reviewState === "failed") {
      return null;
    }
    const [released] = await tx
      .update(kkWallets)
      .set({
        reservedMilli: sql`${kkWallets.reservedMilli} - ${row.reservedMilli}`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(kkWallets.id, row.walletId), sql`${kkWallets.reservedMilli} >= ${row.reservedMilli}`))
      .returning({ participantAccountId: kkWallets.participantAccountId });
    if (!released) return null;
    const [updated] = await tx
      .update(kkWalletWithdrawals)
      .set({
        reviewState,
        status: reviewState === "rejected" ? "cancelled" : "failed",
        failureReason: reason,
        reservedMilli: 0,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(kkWalletWithdrawals.id, row.id),
          inArray(kkWalletWithdrawals.reviewState, [...OPEN_WITHDRAWAL_STATES]),
        ),
      )
      .returning({ id: kkWalletWithdrawals.id });
    if (!updated) throw new Error("Withdrawal release did not apply");
    await clawRefundShortfall(tx as unknown as Db, row.walletId);
    return released.participantAccountId;
  });
  if (accountId) await notifyWithdrawalUpdate(accountId);
  return accountId;
}

async function finalizeWithdrawal(withdrawalId: string) {
  const db = getDb();
  const accountId = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(kkWalletWithdrawals)
      .where(eq(kkWalletWithdrawals.id, withdrawalId))
      .limit(1)
      .for("update");
    if (!row || row.ledgerEntryId || !OPEN_WITHDRAWAL_STATES.includes(row.reviewState as (typeof OPEN_WITHDRAWAL_STATES)[number])) {
      return null;
    }
    const now = new Date().toISOString();
    const [wallet] = await tx
      .update(kkWallets)
      .set({
        balanceMilli: sql`${kkWallets.balanceMilli} - ${row.amountMilli}`,
        reservedMilli: sql`${kkWallets.reservedMilli} - ${row.reservedMilli}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(kkWallets.id, row.walletId),
          sql`${kkWallets.balanceMilli} >= ${row.amountMilli}`,
          sql`${kkWallets.reservedMilli} >= ${row.reservedMilli}`,
        ),
      )
      .returning({ balanceMilli: kkWallets.balanceMilli });
    if (!wallet) return null;
    const idempotencyKey = withdrawalFinalizeIdempotencyKey(row.id);
    const [ledger] = await tx
      .insert(kkWalletLedger)
      .values({
        walletId: row.walletId,
        entryType: "withdrawal",
        amountMilli: -row.amountMilli,
        balanceBeforeMilli: wallet.balanceMilli + row.amountMilli,
        balanceAfterMilli: wallet.balanceMilli,
        idempotencyKey,
        referenceType: "kk_wallet_withdrawal",
        referenceId: row.id,
        description: `USDT TRC20 withdrawal settled (${milliToKkDisplay(row.amountMilli)} KK)`,
      })
      .onConflictDoNothing()
      .returning({ id: kkWalletLedger.id });
    if (!ledger) throw new Error("Withdrawal settlement ledger conflict");
    const [updated] = await tx
      .update(kkWalletWithdrawals)
      .set({
        reviewState: "completed",
        status: "completed",
        providerStatus: "FINISHED",
        ledgerEntryId: ledger.id,
        reservedMilli: 0,
        updatedAt: now,
      })
      .where(
        and(
          eq(kkWalletWithdrawals.id, row.id),
          inArray(kkWalletWithdrawals.reviewState, [...OPEN_WITHDRAWAL_STATES]),
        ),
      )
      .returning({ id: kkWalletWithdrawals.id });
    if (!updated) throw new Error("Withdrawal settlement did not apply");
    const [walletRow] = await tx
      .select({ participantAccountId: kkWallets.participantAccountId })
      .from(kkWallets)
      .where(eq(kkWallets.id, row.walletId))
      .limit(1);
    return walletRow?.participantAccountId ?? null;
  });
  if (accountId) await notifyWithdrawalUpdate(accountId);
}

export async function handleNowPaymentsIpn(
  rawBody: string,
  signatureHeader: string | null,
  deps?: { config?: NowPaymentsConfig; client?: NowPaymentsClient },
) {
  const config = deps?.config ?? readNowPaymentsConfig();
  if (!config.ipnSecret) return { status: 503 as const, body: { error: "not_configured" } };
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object") return { status: 400 as const, body: { error: "invalid_json" } };
    payload = parsed as Record<string, unknown>;
  } catch {
    return { status: 400 as const, body: { error: "invalid_json" } };
  }
  if (!verifyIpnSignature(payload, signatureHeader, config.ipnSecret)) {
    return { status: 401 as const, body: { error: "invalid_signature" } };
  }
  const db = getDb();
  const eventKey = ipnEventKey(rawBody);
  const [inserted] = await db
    .insert(kkPaymentEvents)
    .values({
      provider: "nowpayments",
      eventKey,
      providerPaymentId: payload.payment_id == null ? (payload.id == null ? null : String(payload.id)) : String(payload.payment_id),
      orderId: typeof payload.order_id === "string" ? payload.order_id : null,
      providerStatus:
        typeof payload.payment_status === "string"
          ? payload.payment_status
          : typeof payload.status === "string"
            ? payload.status
            : null,
      payload,
    })
    .onConflictDoNothing()
    .returning({ id: kkPaymentEvents.id });
  const [event] = inserted
    ? [inserted]
    : await db
        .select({ id: kkPaymentEvents.id, processedAt: kkPaymentEvents.processedAt })
        .from(kkPaymentEvents)
        .where(and(eq(kkPaymentEvents.provider, "nowpayments"), eq(kkPaymentEvents.eventKey, eventKey)))
        .limit(1);
  if (!event) return { status: 500 as const, body: { error: "event_unavailable" } };
  if ("processedAt" in event && event.processedAt) return { status: 200 as const, body: { duplicate: true } };

  try {
    if (payload.payment_id != null) {
      const orderId = typeof payload.order_id === "string" ? payload.order_id : null;
      const paymentId = String(payload.payment_id);
      const [deposit] = await db
        .select()
        .from(kkWalletDeposits)
        .where(orderId ? eq(kkWalletDeposits.orderId, orderId) : eq(kkWalletDeposits.providerPaymentId, paymentId))
        .limit(1);
      if (deposit?.providerPaymentId && deposit.providerPaymentId !== paymentId) {
        await db
          .update(kkWalletDeposits)
          .set({ reviewReason: "unmatched_payment", updatedAt: new Date().toISOString() })
          .where(and(eq(kkWalletDeposits.id, deposit.id), isNull(kkWalletDeposits.reviewReason)));
      } else if (deposit?.providerPaymentId) {
        const nowpayments = clientFor(config, deps?.client);
        const reconciled = await nowpayments.getPayment(deposit.providerPaymentId);
        await applyObservedDeposit(deposit.id, observedFrom(reconciled), observedFrom(reconciled));
      }
    } else if (typeof payload.status === "string" && (payload.id != null || payload.batch_withdrawal_id != null)) {
      const payoutId = payload.id == null ? null : String(payload.id);
      const batchId = payload.batch_withdrawal_id == null ? null : String(payload.batch_withdrawal_id);
      const [withdrawal] = await db
        .select()
        .from(kkWalletWithdrawals)
        .where(
          payoutId && batchId
            ? or(eq(kkWalletWithdrawals.providerPayoutId, payoutId), eq(kkWalletWithdrawals.providerBatchId, batchId))
            : payoutId
              ? eq(kkWalletWithdrawals.providerPayoutId, payoutId)
              : eq(kkWalletWithdrawals.providerBatchId, batchId!),
        )
        .limit(1);
      if (withdrawal?.destinationAddress && withdrawal.providerPayoutId) {
        const nowpayments = clientFor(config, deps?.client);
        const payout = await nowpayments.getPayout(withdrawal.providerPayoutId);
        const decision = decidePayoutUpdate({
          currentReviewState: withdrawal.reviewState,
          expected: {
            payoutId: withdrawal.providerPayoutId,
            address: withdrawal.destinationAddress,
            amountDecimal: milliToUsdtDecimal(withdrawal.amountMilli),
          },
          observed: payout,
        });
        if (decision.kind === "complete") await finalizeWithdrawal(withdrawal.id);
        if (decision.kind === "release") await releaseReservation(withdrawal.id, "failed", decision.reason);
        if (decision.kind === "processing") {
          await db
            .update(kkWalletWithdrawals)
            .set({ reviewState: "processing", status: "processing", providerStatus: payout.status, updatedAt: new Date().toISOString() })
            .where(
              and(
                eq(kkWalletWithdrawals.id, withdrawal.id),
                inArray(kkWalletWithdrawals.reviewState, [...OPEN_WITHDRAWAL_STATES]),
              ),
            );
        }
        if (decision.kind === "review") {
          await db
            .update(kkWalletWithdrawals)
            .set({ failureReason: decision.reason, providerStatus: payout.status, updatedAt: new Date().toISOString() })
            .where(
              and(
                eq(kkWalletWithdrawals.id, withdrawal.id),
                inArray(kkWalletWithdrawals.reviewState, [...OPEN_WITHDRAWAL_STATES]),
              ),
            );
        }
      }
    }
  } catch (error) {
    if (error instanceof NowPaymentsProviderError) {
      return { status: 503 as const, body: { error: "provider_unavailable" } };
    }
    throw error;
  }

  await db
    .update(kkPaymentEvents)
    .set({ processedAt: new Date().toISOString() })
    .where(eq(kkPaymentEvents.id, event.id));
  return { status: 200 as const, body: { received: true } };
}

export async function reviewWithdrawal(input: {
  withdrawalId: string;
  action: "reject" | "approve";
  verificationCode?: string;
  actorId: string;
  actorRole: AdminRole;
  deps?: { config?: NowPaymentsConfig; client?: NowPaymentsClient };
}) {
  assertSuperAdmin(input.actorRole);
  const db = getDb();
  const [row] = await db.select().from(kkWalletWithdrawals).where(eq(kkWalletWithdrawals.id, input.withdrawalId)).limit(1);
  if (!row) throw new WalletError("Withdrawal not found.", "NOT_FOUND", 404);
  const payoutAlreadySent = Boolean(
    row.providerBatchId ||
      row.providerPayoutId ||
      row.providerStatus === "submitting" ||
      row.providerStatus === "created_unparsed",
  );
  if (input.action === "reject") {
    if (payoutAlreadySent) {
      throw new WalletError(
        "This withdrawal may already have a payout. Reconcile the provider status before releasing KK.",
        "CONFLICT",
        409,
      );
    }
    const accountId = await releaseReservation(row.id, "rejected", "Rejected by super admin");
    if (!accountId) throw new WalletError("Withdrawal could not be rejected.", "CONFLICT", 409);
    await recordAdminAuditEvent({
      eventType: "ARENA_WALLET_ADJUSTMENT",
      actorId: input.actorId,
      actorRole: input.actorRole,
      metadata: { withdrawalId: row.id, action: "reject" },
    });
    return { withdrawalId: row.id, reviewState: "rejected" };
  }
  const config = input.deps?.config ?? readNowPaymentsConfig();
  if (!config.payoutsEnabled || !config.ipnCallbackUrl) {
    throw new WalletError(
      "Payouts are disabled. NOWPayments requires a payout JWT, and the account still needs IP whitelist, address whitelist, and 2FA before USDT can be sent.",
      "CONFIGURATION_UNAVAILABLE",
      503,
    );
  }
  if (!input.verificationCode || !/^\d{6}$/.test(input.verificationCode)) {
    throw new WalletError("A current 2FA code is required to send a payout.", "VALIDATION_ERROR", 400);
  }
  if (!row.destinationAddress) throw new WalletError("Withdrawal address is missing.", "VALIDATION_ERROR", 400);
  const nowpayments = clientFor(config, input.deps?.client);
  if (row.providerBatchId) {
    await nowpayments.verifyPayout(row.providerBatchId, input.verificationCode);
    await db
      .update(kkWalletWithdrawals)
      .set({ reviewState: "processing", status: "processing", updatedAt: new Date().toISOString() })
      .where(eq(kkWalletWithdrawals.id, row.id));
    await recordAdminAuditEvent({
      eventType: "ARENA_WALLET_ADJUSTMENT",
      actorId: input.actorId,
      actorRole: input.actorRole,
      metadata: { withdrawalId: row.id, action: "verify", providerBatchId: row.providerBatchId },
    });
    return { withdrawalId: row.id, reviewState: "processing" };
  }
  if (payoutAlreadySent || row.reviewState !== "pending_review" || row.reservedMilli !== row.amountMilli || row.reservedMilli <= 0) {
    throw new WalletError(
      "A payout may already have been sent. Reconcile it before trying again.",
      "CONFLICT",
      409,
    );
  }
  const [claimed] = await db
    .update(kkWalletWithdrawals)
    .set({ reviewState: "approved", providerStatus: "submitting", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(kkWalletWithdrawals.id, row.id),
        eq(kkWalletWithdrawals.reviewState, "pending_review"),
        isNull(kkWalletWithdrawals.providerBatchId),
        isNull(kkWalletWithdrawals.providerPayoutId),
      ),
    )
    .returning({ id: kkWalletWithdrawals.id });
  if (!claimed) {
    throw new WalletError("A payout may already have been sent. Reconcile it before trying again.", "CONFLICT", 409);
  }
  let payout;
  try {
    payout = await nowpayments.createPayout({
      address: row.destinationAddress,
      amountDecimal: milliToUsdtDecimal(row.amountMilli),
      ipnCallbackUrl: config.ipnCallbackUrl,
    });
  } catch (error) {
    if (error instanceof NowPaymentsProviderError && error.status >= 400 && error.status < 500) {
      await db
        .update(kkWalletWithdrawals)
        .set({ reviewState: "pending_review", providerStatus: "create_rejected", updatedAt: new Date().toISOString() })
        .where(and(eq(kkWalletWithdrawals.id, row.id), isNull(kkWalletWithdrawals.providerBatchId)));
    }
    providerFailure(error);
  }
  if (!payout!.batchId) {
    await db
      .update(kkWalletWithdrawals)
      .set({ reviewState: "processing", providerStatus: "created_unparsed", updatedAt: new Date().toISOString() })
      .where(eq(kkWalletWithdrawals.id, row.id));
    throw new WalletError("Payout was accepted but the provider id was missing. It is held for reconciliation.", "CONFIGURATION_UNAVAILABLE", 502);
  }
  await db
    .update(kkWalletWithdrawals)
    .set({
      reviewState: "processing",
      status: "processing",
      providerBatchId: payout!.batchId,
      providerPayoutId: payout!.payoutId,
      providerStatus: payout!.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(kkWalletWithdrawals.id, row.id));
  await nowpayments.verifyPayout(payout!.batchId, input.verificationCode);
  await recordAdminAuditEvent({
    eventType: "ARENA_WALLET_ADJUSTMENT",
    actorId: input.actorId,
    actorRole: input.actorRole,
    metadata: { withdrawalId: row.id, action: "approve", providerBatchId: payout!.batchId },
  });
  return { withdrawalId: row.id, reviewState: "processing" };
}

export async function reconcileWithdrawal(
  withdrawalId: string,
  deps?: { config?: NowPaymentsConfig; client?: NowPaymentsClient },
) {
  const db = getDb();
  const [row] = await db.select().from(kkWalletWithdrawals).where(eq(kkWalletWithdrawals.id, withdrawalId)).limit(1);
  if (!row?.providerPayoutId || !row.destinationAddress) {
    throw new WalletError("This withdrawal has no provider payout to check.", "NOT_FOUND", 404);
  }
  const config = deps?.config ?? readNowPaymentsConfig();
  const nowpayments = clientFor(config, deps?.client);
  const payout = await nowpayments.getPayout(row.providerPayoutId);
  const decision = decidePayoutUpdate({
    currentReviewState: row.reviewState,
    expected: {
      payoutId: row.providerPayoutId,
      address: row.destinationAddress,
      amountDecimal: milliToUsdtDecimal(row.amountMilli),
    },
    observed: payout,
  });
  if (decision.kind === "complete") await finalizeWithdrawal(row.id);
  if (decision.kind === "release") await releaseReservation(row.id, "failed", decision.reason);
  if (decision.kind === "processing") {
    await db
      .update(kkWalletWithdrawals)
      .set({ reviewState: "processing", status: "processing", providerStatus: payout.status, updatedAt: new Date().toISOString() })
      .where(eq(kkWalletWithdrawals.id, row.id));
  }
  return { withdrawalId: row.id, providerStatus: payout.status };
}

export async function listAdminWalletOperations() {
  const db = getDb();
  const deposits = await db
    .select({
      id: kkWalletDeposits.id,
      username: participantAccounts.username,
      amountMilli: kkWalletDeposits.amountMilli,
      status: kkWalletDeposits.status,
      providerStatus: kkWalletDeposits.providerStatus,
      providerPaymentId: kkWalletDeposits.providerPaymentId,
      orderId: kkWalletDeposits.orderId,
      payAmountText: kkWalletDeposits.payAmountText,
      actuallyPaidText: kkWalletDeposits.actuallyPaidText,
      outcomeAmountText: kkWalletDeposits.outcomeAmountText,
      creditedMilli: kkWalletDeposits.creditedMilli,
      reviewReason: kkWalletDeposits.reviewReason,
      ledgerEntryId: kkWalletDeposits.ledgerEntryId,
      providerFee: kkWalletDeposits.providerFee,
      createdAt: kkWalletDeposits.createdAt,
    })
    .from(kkWalletDeposits)
    .innerJoin(kkWallets, eq(kkWalletDeposits.walletId, kkWallets.id))
    .innerJoin(participantAccounts, eq(kkWallets.participantAccountId, participantAccounts.id))
    .orderBy(desc(kkWalletDeposits.createdAt))
    .limit(50);
  const withdrawals = await db
    .select({
      id: kkWalletWithdrawals.id,
      username: participantAccounts.username,
      amountMilli: kkWalletWithdrawals.amountMilli,
      reviewState: kkWalletWithdrawals.reviewState,
      status: kkWalletWithdrawals.status,
      providerStatus: kkWalletWithdrawals.providerStatus,
      providerPayoutId: kkWalletWithdrawals.providerPayoutId,
      providerBatchId: kkWalletWithdrawals.providerBatchId,
      providerFeeText: kkWalletWithdrawals.providerFeeText,
      ledgerEntryId: kkWalletWithdrawals.ledgerEntryId,
      failureReason: kkWalletWithdrawals.failureReason,
      network: kkWalletWithdrawals.network,
      createdAt: kkWalletWithdrawals.createdAt,
    })
    .from(kkWalletWithdrawals)
    .innerJoin(kkWallets, eq(kkWalletWithdrawals.walletId, kkWallets.id))
    .innerJoin(participantAccounts, eq(kkWallets.participantAccountId, participantAccounts.id))
    .orderBy(desc(kkWalletWithdrawals.createdAt))
    .limit(50);
  const config = readNowPaymentsConfig();
  const exceptions = await db
    .select({
      id: kkPaymentEvents.id,
      providerPaymentId: kkPaymentEvents.providerPaymentId,
      orderId: kkPaymentEvents.orderId,
      providerStatus: kkPaymentEvents.providerStatus,
      createdAt: kkPaymentEvents.createdAt,
    })
    .from(kkPaymentEvents)
    .leftJoin(kkWalletDeposits, eq(kkPaymentEvents.providerPaymentId, kkWalletDeposits.providerPaymentId))
    .leftJoin(
      kkWalletWithdrawals,
      or(
        eq(kkPaymentEvents.providerPaymentId, kkWalletWithdrawals.providerPayoutId),
        eq(kkPaymentEvents.providerPaymentId, kkWalletWithdrawals.providerBatchId),
      ),
    )
    .where(and(isNotNull(kkPaymentEvents.providerPaymentId), isNull(kkWalletDeposits.id), isNull(kkWalletWithdrawals.id)))
    .orderBy(desc(kkPaymentEvents.createdAt))
    .limit(20);
  return {
    depositsEnabled: config.depositsEnabled,
    payoutsEnabled: config.payoutsEnabled,
    exceptions,
    deposits: deposits.map((row) => ({
      ...row,
      amountKk: milliToKkDisplay(row.amountMilli),
      creditedKk: row.creditedMilli == null ? null : milliToKkDisplay(row.creditedMilli),
    })),
    withdrawals: withdrawals.map((row) => ({
      ...row,
      amountKk: milliToKkDisplay(row.amountMilli),
    })),
  };
}

export async function applyWalletAdjustment(input: {
  username: string;
  amountKk: string;
  direction: "credit" | "debit";
  reason: string;
  clientRequestId: string;
  actorId: string;
  actorRole: AdminRole;
}) {
  assertSuperAdmin(input.actorRole);
  if (input.reason.trim().length < 8) {
    throw new WalletError("An adjustment reason is required.", "VALIDATION_ERROR", 400);
  }
  const amountMilli = parseKkInput(input.amountKk);
  const db = getDb();
  const [account] = await db
    .select({ id: participantAccounts.id })
    .from(participantAccounts)
    .where(eq(participantAccounts.usernameNormalized, input.username.trim().toLowerCase()))
    .limit(1);
  if (!account) throw new WalletError("Participant not found.", "NOT_FOUND", 404);
  const wallet = await getOrCreateWallet(account.id);
  const idempotencyKey = `wallet-adjustment:${input.clientRequestId}`;
  const applied = await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(kkWallets).where(eq(kkWallets.id, wallet.id)).limit(1).for("update");
    if (!locked) throw new WalletError("Wallet unavailable.", "WALLET_UNAVAILABLE", 503);
    const [existing] = await tx
      .select({ id: kkWalletLedger.id })
      .from(kkWalletLedger)
      .where(eq(kkWalletLedger.idempotencyKey, idempotencyKey))
      .limit(1);
    if (existing) return false;
    const delta = input.direction === "credit" ? amountMilli : -amountMilli;
    if (delta < 0 && !canSpend(locked.balanceMilli, locked.reservedMilli, amountMilli)) {
      throw new WalletError("Insufficient available KK PTS.", "INSUFFICIENT_BALANCE", 402);
    }
    if (delta < 0) {
      const [updated] = await tx
        .update(kkWallets)
        .set({ balanceMilli: sql`${kkWallets.balanceMilli} + ${delta}`, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(kkWallets.id, locked.id),
            sql`${kkWallets.balanceMilli} - ${kkWallets.reservedMilli} >= ${amountMilli}`,
          ),
        )
        .returning({ balanceMilli: kkWallets.balanceMilli });
      if (!updated) throw new WalletError("Insufficient available KK PTS.", "INSUFFICIENT_BALANCE", 402);
      await tx.insert(kkWalletLedger).values({
        walletId: locked.id,
        entryType: "adjustment",
        amountMilli: delta,
        balanceBeforeMilli: updated.balanceMilli - delta,
        balanceAfterMilli: updated.balanceMilli,
        idempotencyKey,
        referenceType: "wallet_adjustment",
        description: input.reason.trim(),
        metadata: { actorId: input.actorId, direction: input.direction },
      });
      return true;
    }
    const [updated] = await tx
      .update(kkWallets)
      .set({ balanceMilli: sql`${kkWallets.balanceMilli} + ${delta}`, updatedAt: new Date().toISOString() })
      .where(eq(kkWallets.id, locked.id))
      .returning({ balanceMilli: kkWallets.balanceMilli });
    if (!updated) throw new WalletError("Wallet unavailable.", "WALLET_UNAVAILABLE", 503);
    await tx.insert(kkWalletLedger).values({
      walletId: locked.id,
      entryType: "adjustment",
      amountMilli: delta,
      balanceBeforeMilli: updated.balanceMilli - delta,
      balanceAfterMilli: updated.balanceMilli,
      idempotencyKey,
      referenceType: "wallet_adjustment",
      description: input.reason.trim(),
      metadata: { actorId: input.actorId, direction: input.direction },
    });
    return true;
  });
  if (!applied) return;
  await recordAdminAuditEvent({
    eventType: "ARENA_WALLET_ADJUSTMENT",
    actorId: input.actorId,
    actorRole: input.actorRole,
    metadata: { username: input.username, direction: input.direction, amountMilli, reason: input.reason.trim() },
  });
  if (input.direction === "credit") {
    await recordParticipantAuditEvent({
      eventType: "WALLET_DEPOSIT_CREDITED",
      accountId: account.id,
      actor: "admin",
      metadata: { direction: input.direction, amountMilli },
    });
  }
}

export async function notifyDepositOutcome(accountId: string, credited: boolean) {
  await recordParticipantAuditEvent({
    eventType: credited ? "WALLET_DEPOSIT_CREDITED" : "WALLET_DEPOSIT_REVIEW",
    accountId,
    actor: "system",
  });
}

async function notifyWithdrawalUpdate(accountId: string) {
  await recordParticipantAuditEvent({
    eventType: "WALLET_WITHDRAWAL_UPDATE",
    accountId,
    actor: "system",
  });
}
