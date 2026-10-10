import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { compareDecimals, usdtDecimalToMilli } from "@/server/payments/nowpayments/amounts";
import { createNowPaymentsClient } from "@/server/payments/nowpayments/client";
import { readNowPaymentsConfig } from "@/server/payments/nowpayments/config";
import {
  decideDepositCredit,
  decidePayoutUpdate,
  depositCreditIdempotencyKey,
  shouldApplyPaymentStatus,
  withdrawalFinalizeIdempotencyKey,
  type ObservedPayment,
} from "@/server/payments/nowpayments/policy";
import { ipnEventKey, signIpnPayload, verifyIpnSignature } from "@/server/payments/nowpayments/signature";
import { canSpend } from "@/server/wallet/money";

const secret = "ipn-secret";

function observed(overrides: Partial<ObservedPayment> = {}): ObservedPayment {
  return {
    paymentId: "pay-1",
    orderId: "kk-order",
    paymentStatus: "finished",
    payCurrency: "usdttrc20",
    payAmount: "10",
    actuallyPaid: "10",
    outcomeAmount: "10",
    outcomeCurrency: "usdttrc20",
    parentPaymentId: null,
    priceCurrency: "usd",
    ...overrides,
  };
}

const expected = { orderId: "kk-order", providerPaymentId: "pay-1", requestedMilli: 10000 };

describe("NOWPayments IPN signature", () => {
  it("accepts the documented sorted HMAC-SHA512 signature", () => {
    const payload = {
      payment_status: "finished",
      payment_id: 1,
      fee: { serviceFee: 0, currency: "btc", depositFee: 1 },
    };
    const signature = signIpnPayload(payload, secret);
    expect(verifyIpnSignature(payload, signature, secret)).toBe(true);
    expect(verifyIpnSignature(payload, `${signature}aa`, secret)).toBe(false);
    expect(verifyIpnSignature({ ...payload, payment_status: "waiting" }, signature, secret)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyIpnSignature({ payment_id: 1 }, null, secret)).toBe(false);
  });

  it("matches an independently sorted HMAC", () => {
    const payload = { b: 2, a: { d: 4, c: 3 } };
    const canonical = JSON.stringify({ a: { c: 3, d: 4 }, b: 2 });
    const expectedSignature = createHmac("sha512", secret).update(canonical).digest("hex");
    expect(signIpnPayload(payload, secret)).toBe(expectedSignature);
  });
});

describe("NOWPayments deposit credit policy", () => {
  it("does not credit a pending payment", () => {
    for (const paymentStatus of ["waiting", "confirming", "confirmed", "partially_paid", "failed", "expired", "refunded"]) {
      const decision = decideDepositCredit({
        currentStatus: null,
        expected,
        observed: observed({ paymentStatus }),
        reconciled: observed({ paymentStatus }),
      });
      expect(decision.kind === "credit").toBe(false);
    }
  });

  it("credits an exact finished USDT TRC20 payment once per provider payment", () => {
    const decision = decideDepositCredit({
      currentStatus: "confirming",
      expected,
      observed: observed(),
      reconciled: observed(),
    });
    expect(decision).toEqual({ kind: "credit", creditMilli: 10000 });
    expect(depositCreditIdempotencyKey("pay-1")).toBe(depositCreditIdempotencyKey("pay-1"));
  });

  it("holds underpayment and overpayment for review", () => {
    expect(
      decideDepositCredit({
        currentStatus: null,
        expected,
        observed: observed({ actuallyPaid: "9", outcomeAmount: "9" }),
        reconciled: observed({ actuallyPaid: "9", outcomeAmount: "9" }),
      }),
    ).toEqual({ kind: "review", reason: "underpayment" });
    expect(
      decideDepositCredit({
        currentStatus: null,
        expected,
        observed: observed({ outcomeAmount: "11", actuallyPaid: "11", payAmount: "10" }),
        reconciled: observed({ outcomeAmount: "11", actuallyPaid: "11", payAmount: "10" }),
      }),
    ).toEqual({ kind: "review", reason: "overpayment" });
  });

  it("rejects the wrong currency, network, order, or payment", () => {
    expect(
      decideDepositCredit({
        currentStatus: null,
        expected,
        observed: observed({ payCurrency: "usdterc20" }),
        reconciled: observed({ payCurrency: "usdterc20" }),
      }).kind,
    ).toBe("review");
    expect(
      decideDepositCredit({
        currentStatus: null,
        expected,
        observed: observed({ orderId: "other" }),
        reconciled: observed({ orderId: "other" }),
      }),
    ).toEqual({ kind: "review", reason: "order_mismatch" });
    expect(
      decideDepositCredit({
        currentStatus: null,
        expected,
        observed: observed({ paymentId: "other" }),
        reconciled: observed(),
      }),
    ).toEqual({ kind: "review", reason: "payment_mismatch" });
  });

  it("ignores an older status after a payment is finished", () => {
    expect(shouldApplyPaymentStatus("finished", "waiting")).toBe(false);
    expect(
      decideDepositCredit({
        currentStatus: "finished",
        expected,
        observed: observed({ paymentStatus: "waiting" }),
        reconciled: null,
      }),
    ).toEqual({ kind: "ignore_regression" });
  });

  it("does not credit when provider reconciliation disagrees", () => {
    expect(
      decideDepositCredit({
        currentStatus: "confirming",
        expected,
        observed: observed(),
        reconciled: observed({ paymentStatus: "confirming" }),
      }),
    ).toEqual({ kind: "review", reason: "reconciliation_mismatch" });
  });

  it("floors USDT to milli without rounding up", () => {
    expect(usdtDecimalToMilli("10.1239")).toBe(10123);
    expect(compareDecimals("9.5", "10")).toBe(-1);
  });

  it("uses one event key for a duplicate body", () => {
    expect(ipnEventKey("{\"payment_id\":1}")).toBe(ipnEventKey("{\"payment_id\":1}"));
  });
});

describe("NOWPayments payouts", () => {
  it("releases a rejected payout once and settles a finished payout once", () => {
    const base = {
      currentReviewState: "processing",
      expected: { payoutId: "w1", address: "T" + "1".repeat(33), amountDecimal: "10" },
    };
    expect(
      decidePayoutUpdate({
        ...base,
        observed: { payoutId: "w1", status: "REJECTED", currency: "usdttrc20", amount: "10", address: base.expected.address },
      }),
    ).toEqual({ kind: "release", reason: "REJECTED" });
    expect(
      decidePayoutUpdate({
        ...base,
        observed: { payoutId: "w1", status: "FINISHED", currency: "usdttrc20", amount: "10", address: base.expected.address },
      }),
    ).toEqual({ kind: "complete" });
    expect(
      decidePayoutUpdate({
        ...base,
        currentReviewState: "completed",
        observed: { payoutId: "w1", status: "FINISHED", currency: "usdttrc20", amount: "10", address: base.expected.address },
      }),
    ).toEqual({ kind: "ignore" });
    expect(withdrawalFinalizeIdempotencyKey("w1")).toBe("nowpayments-withdrawal:w1");
  });

  it("does not enable payouts from an API key alone", () => {
    const config = readNowPaymentsConfig({
      NOWPAYMENTS_API_KEY: "key",
      NOWPAYMENTS_IPN_SECRET: "secret",
      NOWPAYMENTS_IPN_CALLBACK_URL: "https://example.com/api/webhooks/nowpayments",
      NOWPAYMENTS_DEPOSITS_ENABLED: "true",
      NOWPAYMENTS_PAYOUTS_ENABLED: "true",
    });
    expect(config.depositsEnabled).toBe(true);
    expect(config.payoutsEnabled).toBe(false);
  });
});

describe("wallet reservation", () => {
  it("lets only one concurrent spend reserve the same available balance", () => {
    const state = { balance: 10000, reserved: 0 };
    const take = (amount: number) => {
      if (!canSpend(state.balance, state.reserved, amount)) return false;
      state.reserved += amount;
      return true;
    };
    expect(take(10000)).toBe(true);
    expect(take(1)).toBe(false);
    expect(canSpend(10000, 10000, 500)).toBe(false);
  });
});

describe("NOWPayments client", () => {
  const config = {
    apiKey: "key",
    ipnSecret: "secret",
    baseUrl: "https://api.nowpayments.io/v1",
    ipnCallbackUrl: "https://example.com/api/webhooks/nowpayments",
    depositsEnabled: true,
    payoutsEnabled: false,
    email: null,
    password: null,
    payCurrency: "usdttrc20",
    priceCurrency: "usd",
  };

  it("creates a payment and returns the provider address and amount", async () => {
    const client = createNowPaymentsClient(config, async (input) => {
      expect(input.url).toContain("/payment");
      expect(input.headers["x-api-key"]).toBe("key");
      expect(input.body).toContain("\"pay_currency\":\"usdttrc20\"");
      expect(input.body).toContain("\"order_id\":\"kk-order\"");
      return {
        status: 200,
        raw: JSON.stringify({
          payment_id: 99,
          pay_address: "T123",
          pay_amount: 10.5,
          pay_currency: "usdttrc20",
          payment_status: "waiting",
          price_amount: 10,
        }),
      };
    });
    const payment = await client.createPayment({
      priceAmount: "10",
      orderId: "kk-order",
      description: "KIRAKITAH KK PTS deposit",
    });
    expect(payment.payAddress).toBe("T123");
    expect(payment.payAmount).toBe("10.5");
    expect(payment.paymentId).toBe("99");
  });

  it("surfaces a provider failure without creating an address", async () => {
    const client = createNowPaymentsClient(config, async () => ({
      status: 500,
      raw: "{\"message\":\"temporary outage\"}",
    }));
    await expect(
      client.createPayment({ priceAmount: "10", orderId: "kk-order", description: "deposit" }),
    ).rejects.toThrow(/temporary outage/);
  });
});

describe("wallet finance RBAC", () => {
  it("limits NOWPayments operations to super admin", () => {
    expect(roleHasPermission("SUPER_ADMIN", "wallet:finance")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "wallet:finance")).toBe(false);
    expect(roleHasPermission("REVIEWER", "wallet:finance")).toBe(false);
    expect(roleHasPermission("SUPPORT", "wallet:finance")).toBe(false);
  });
});
