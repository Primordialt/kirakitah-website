import { compareDecimals, usdtDecimalToMilli } from "@/server/payments/nowpayments/amounts";

export const NOWPAYMENTS_PAY_CURRENCY = "usdttrc20";
export const NOWPAYMENTS_PRICE_CURRENCY = "usd";
export const NOWPAYMENTS_NETWORK_LABEL = "USDT TRC20";

const TERMINAL_PAYMENT_STATUSES = new Set(["finished", "failed", "refunded", "expired"]);

const PAYMENT_STATUS_RANK: Record<string, number> = {
  waiting: 10,
  confirming: 20,
  confirmed: 30,
  sending: 40,
  partially_paid: 50,
  finished: 80,
  failed: 90,
  refunded: 90,
  expired: 90,
};

const NON_CREDIT_STATUSES = new Set([
  "waiting",
  "confirming",
  "confirmed",
  "sending",
  "partially_paid",
  "failed",
  "refunded",
  "expired",
]);

export type CreditDecision =
  | { kind: "status_only" }
  | { kind: "ignore_regression" }
  | {
      kind: "review";
      reason:
        | "underpayment"
        | "overpayment"
        | "wrong_currency"
        | "order_mismatch"
        | "payment_mismatch"
        | "repeated_deposit"
        | "missing_outcome"
        | "not_finished"
        | "reconciliation_mismatch";
    }
  | { kind: "credit"; creditMilli: number };

export type ObservedPayment = {
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
};

export function shouldApplyPaymentStatus(current: string | null, incoming: string): boolean {
  if (incoming === "refunded") return true;
  if (!current) return true;
  if (TERMINAL_PAYMENT_STATUSES.has(current) && current !== incoming) return false;
  const currentRank = PAYMENT_STATUS_RANK[current] ?? 0;
  const incomingRank = PAYMENT_STATUS_RANK[incoming] ?? 0;
  return incomingRank >= currentRank;
}

export function depositCreditIdempotencyKey(providerPaymentId: string): string {
  return `nowpayments-deposit:${providerPaymentId}`;
}

/**
 * `price_amount` is the fiat price (USD). It is not USDT.
 * `pay_amount` and `actually_paid` are in `pay_currency`.
 * `outcome_amount` is the amount credited to the merchant balance, in `outcome_currency`.
 * Auto-credit uses outcome_amount only when that currency is the USDT TRC20 ticker
 * and, at milli precision, it equals the KK the participant requested.
 */
export function decideDepositCredit(input: {
  currentStatus: string | null;
  expected: {
    orderId: string;
    providerPaymentId: string;
    requestedMilli: number;
  };
  observed: ObservedPayment;
  reconciled: ObservedPayment | null;
}): CreditDecision {
  if (!shouldApplyPaymentStatus(input.currentStatus, input.observed.paymentStatus)) {
    return { kind: "ignore_regression" };
  }

  if (input.observed.paymentId !== input.expected.providerPaymentId) {
    return { kind: "review", reason: "payment_mismatch" };
  }
  if (input.observed.orderId !== input.expected.orderId) {
    return { kind: "review", reason: "order_mismatch" };
  }
  if (NON_CREDIT_STATUSES.has(input.observed.paymentStatus)) {
    return { kind: "status_only" };
  }
  if (input.observed.paymentStatus !== "finished") {
    return { kind: "review", reason: "not_finished" };
  }
  if (input.observed.parentPaymentId) {
    return { kind: "review", reason: "repeated_deposit" };
  }
  if (
    input.observed.payCurrency?.toLowerCase() !== NOWPAYMENTS_PAY_CURRENCY ||
    (input.observed.priceCurrency &&
      input.observed.priceCurrency.toLowerCase() !== NOWPAYMENTS_PRICE_CURRENCY) ||
    input.observed.outcomeCurrency?.toLowerCase() !== NOWPAYMENTS_PAY_CURRENCY
  ) {
    return { kind: "review", reason: "wrong_currency" };
  }
  if (!input.reconciled) {
    return { kind: "review", reason: "reconciliation_mismatch" };
  }
  if (
    input.reconciled.paymentStatus !== "finished" ||
    input.reconciled.paymentId !== input.observed.paymentId ||
    input.reconciled.orderId !== input.observed.orderId ||
    input.reconciled.payCurrency?.toLowerCase() !== NOWPAYMENTS_PAY_CURRENCY ||
    input.reconciled.outcomeCurrency?.toLowerCase() !== NOWPAYMENTS_PAY_CURRENCY ||
    input.reconciled.outcomeAmount !== input.observed.outcomeAmount ||
    input.reconciled.actuallyPaid !== input.observed.actuallyPaid
  ) {
    return { kind: "review", reason: "reconciliation_mismatch" };
  }
  if (!input.observed.outcomeAmount || !input.observed.payAmount || !input.observed.actuallyPaid) {
    return { kind: "review", reason: "missing_outcome" };
  }
  const paidVersusInvoice = compareDecimals(input.observed.actuallyPaid, input.observed.payAmount);
  const outcomeMilli = usdtDecimalToMilli(input.observed.outcomeAmount);
  if (paidVersusInvoice === null || outcomeMilli === null) {
    return { kind: "review", reason: "missing_outcome" };
  }
  if (paidVersusInvoice < 0 || outcomeMilli < input.expected.requestedMilli) {
    return { kind: "review", reason: "underpayment" };
  }
  if (outcomeMilli > input.expected.requestedMilli) {
    return { kind: "review", reason: "overpayment" };
  }
  return { kind: "credit", creditMilli: outcomeMilli };
}

export type CreditedFollowUp =
  | { kind: "none" }
  | { kind: "reverse" }
  | { kind: "exception"; reason: "post_credit_status_change" | "payment_mismatch" };

/** A credited deposit stays credited until the provider and a fresh status read both say refunded. */
export function decideCreditedDepositFollowUp(input: {
  expectedPaymentId: string;
  observed: ObservedPayment;
  reconciled: ObservedPayment | null;
}): CreditedFollowUp {
  if (
    input.observed.paymentId !== input.expectedPaymentId ||
    !input.reconciled ||
    input.reconciled.paymentId !== input.expectedPaymentId ||
    input.reconciled.paymentStatus !== input.observed.paymentStatus
  ) {
    return { kind: "exception", reason: "payment_mismatch" };
  }
  if (input.reconciled.paymentStatus === "refunded") return { kind: "reverse" };
  if (input.reconciled.paymentStatus !== "finished") {
    return { kind: "exception", reason: "post_credit_status_change" };
  }
  return { kind: "none" };
}

export function depositReversalIdempotencyKey(providerPaymentId: string, alreadyClawedMilli: number): string {
  return `nowpayments-deposit-reversal:${providerPaymentId}:${alreadyClawedMilli}`;
}

/**
 * `min_amount` is the provider minimum for the requested currency pair.
 * Compare it with the estimated pay-currency amount, not with the USD price.
 */
export function depositMeetsMinimum(estimatedPayAmount: string | null, minAmount: string | null): boolean | null {
  if (!minAmount) return true;
  if (!estimatedPayAmount) return null;
  const compared = compareDecimals(estimatedPayAmount, minAmount);
  if (compared === null) return null;
  return compared >= 0;
}

const PAYOUT_PROGRESS = new Set(["NEW", "CREATING", "WAITING", "PROCESSING"]);
const PAYOUT_RELEASE = new Set(["REJECTED", "REJECTED_NOT_CHECKED"]);

export type PayoutDecision =
  | { kind: "processing" }
  | { kind: "ignore" }
  | { kind: "complete" }
  | { kind: "release"; reason: string }
  | { kind: "review"; reason: "payout_mismatch" | "wrong_currency" | "amount_mismatch" };

export function decidePayoutUpdate(input: {
  currentReviewState: string;
  expected: {
    payoutId: string;
    address: string;
    amountDecimal: string;
  };
  observed: {
    payoutId: string;
    status: string;
    currency: string | null;
    amount: string | null;
    address: string | null;
  };
}): PayoutDecision {
  if (input.currentReviewState === "completed" || input.currentReviewState === "rejected" || input.currentReviewState === "failed") {
    return { kind: "ignore" };
  }
  if (input.observed.payoutId !== input.expected.payoutId) {
    return { kind: "review", reason: "payout_mismatch" };
  }
  if (input.observed.currency?.toLowerCase() !== NOWPAYMENTS_PAY_CURRENCY) {
    return { kind: "review", reason: "wrong_currency" };
  }
  if (
    !input.observed.amount ||
    !input.observed.address ||
    compareDecimals(input.observed.amount, input.expected.amountDecimal) !== 0 ||
    input.observed.address !== input.expected.address
  ) {
    return { kind: "review", reason: "amount_mismatch" };
  }
  if (input.observed.status === "FINISHED") return { kind: "complete" };
  if (PAYOUT_RELEASE.has(input.observed.status)) {
    return { kind: "release", reason: input.observed.status };
  }
  if (PAYOUT_PROGRESS.has(input.observed.status)) return { kind: "processing" };
  return { kind: "review", reason: "payout_mismatch" };
}

export function withdrawalFinalizeIdempotencyKey(withdrawalId: string): string {
  return `nowpayments-withdrawal:${withdrawalId}`;
}
