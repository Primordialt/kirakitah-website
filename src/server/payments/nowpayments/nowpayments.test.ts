import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { compareDecimals, usdtDecimalToMilli } from "@/server/payments/nowpayments/amounts";
import { createNowPaymentsClient, resetNowPaymentsAuthCache } from "@/server/payments/nowpayments/client";
import { readNowPaymentsConfig } from "@/server/payments/nowpayments/config";
import {
  decideCreditedDepositFollowUp,
  decideDepositCredit,
  decidePayoutUpdate,
  depositCreditIdempotencyKey,
  depositMeetsMinimum,
  selectPayoutForWithdrawal,
  shouldApplyPaymentStatus,
  withdrawalFinalizeIdempotencyKey,
  type ObservedPayment,
} from "@/server/payments/nowpayments/policy";
import { isDisposableWalletTestDatabase } from "@/server/payments/nowpayments/test-database";
import { reconcileWithdrawal, refreshUsdtDeposit } from "@/server/payments/nowpayments/service";
import type { NowPaymentsClient } from "@/server/payments/nowpayments/client";
import { POST as nowPaymentsWebhook } from "@/app/api/webhooks/nowpayments/route";
import { useDatabaseForTests, type Db } from "@/server/db";
import { kkPaymentEvents, kkWalletDeposits, kkWalletLedger, kkWallets } from "@/server/db/schema";
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

  it("does not treat a non-USDT outcome as settled USDT", () => {
    expect(
      decideDepositCredit({
        currentStatus: null,
        expected,
        observed: observed({ outcomeCurrency: "trx", outcomeAmount: "10" }),
        reconciled: observed({ outcomeCurrency: "trx", outcomeAmount: "10" }),
      }),
    ).toEqual({ kind: "review", reason: "wrong_currency" });
  });

  it("credits the settled outcome amount, not a larger fiat price", () => {
    const decision = decideDepositCredit({
      currentStatus: "confirming",
      expected,
      observed: observed(),
      reconciled: observed(),
    });
    expect(decision).toEqual({ kind: "credit", creditMilli: 10000 });
  });

  it("follows a refund after credit and ignores a stale waiting update", () => {
    expect(shouldApplyPaymentStatus("finished", "refunded")).toBe(true);
    expect(shouldApplyPaymentStatus("finished", "waiting")).toBe(false);
    expect(
      decideCreditedDepositFollowUp({
        expectedPaymentId: "pay-1",
        observed: observed({ paymentStatus: "refunded" }),
        reconciled: observed({ paymentStatus: "refunded" }),
      }),
    ).toEqual({ kind: "reverse" });
    expect(
      decideCreditedDepositFollowUp({
        expectedPaymentId: "pay-1",
        observed: observed({ paymentStatus: "finished" }),
        reconciled: observed({ paymentStatus: "failed" }),
      }),
    ).toEqual({ kind: "exception", reason: "payment_mismatch" });
  });

  it("compares the provider minimum with the estimated pay amount", () => {
    expect(depositMeetsMinimum("9.5", "10")).toBe(false);
    expect(depositMeetsMinimum("10", "10")).toBe(true);
    expect(depositMeetsMinimum(null, "10")).toBe(null);
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

  it("matches a payout only by its withdrawal reference unless an operator pins one id", () => {
    const address = `T${"1".repeat(33)}`;
    const candidate = {
      payoutId: "p1",
      batchId: "b1",
      status: "FINISHED",
      currency: "usdttrc20",
      amount: "10",
      address,
      uniqueExternalId: "withdrawal-1",
      fee: "1",
    };
    expect(
      selectPayoutForWithdrawal({
        withdrawalId: "withdrawal-1",
        address,
        amountDecimal: "10",
        candidates: [candidate, { ...candidate, payoutId: "p2", uniqueExternalId: "withdrawal-2" }],
        operatorPinned: false,
      }).kind,
    ).toBe("matched");
    expect(
      selectPayoutForWithdrawal({
        withdrawalId: "withdrawal-1",
        address,
        amountDecimal: "10",
        candidates: [{ ...candidate, uniqueExternalId: null }],
        operatorPinned: false,
      }),
    ).toEqual({ kind: "unresolved", reason: "not_found" });
    expect(
      selectPayoutForWithdrawal({
        withdrawalId: "withdrawal-1",
        address,
        amountDecimal: "10",
        candidates: [{ ...candidate, uniqueExternalId: "other" }],
        operatorPinned: true,
      }),
    ).toEqual({ kind: "unresolved", reason: "reference_mismatch" });
    expect(
      selectPayoutForWithdrawal({
        withdrawalId: "withdrawal-1",
        address,
        amountDecimal: "10",
        candidates: [{ ...candidate, uniqueExternalId: null }],
        operatorPinned: true,
      }).kind,
    ).toBe("matched");
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

describe("NOWPayments IPN while deposits are disabled", () => {
  const ipnSecret = "ipn-secret";
  const disabledEnv = {
    NOWPAYMENTS_API_KEY: "test-key",
    NOWPAYMENTS_IPN_SECRET: ipnSecret,
    NOWPAYMENTS_IPN_CALLBACK_URL: "https://example.com/api/webhooks/nowpayments",
    NOWPAYMENTS_DEPOSITS_ENABLED: "false",
    NOWPAYMENTS_PAYOUTS_ENABLED: "false",
  };
  const payload = {
    payment_id: "pay-1",
    order_id: "kk-order",
    payment_status: "finished",
    pay_currency: "usdttrc20",
    price_currency: "usd",
    pay_amount: 10,
    actually_paid: 10,
    outcome_amount: 10,
    outcome_currency: "usdttrc20",
  };

  afterEach(() => {
    useDatabaseForTests(null);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function finishedPayment(payCurrency = "usdttrc20") {
    return JSON.stringify({
      payment_id: "pay-1",
      order_id: "kk-order",
      payment_status: "finished",
      pay_currency: payCurrency,
      pay_amount: 10,
      actually_paid: 10,
      outcome_amount: 10,
      outcome_currency: payCurrency,
      price_currency: "usd",
    });
  }

  function harness() {
    const wallet = { balanceMilli: 0 };
    const ledger: Array<{ id: string; entryType: string }> = [];
    const events: Array<{ id: string; eventKey: string; processedAt: string | null }> = [];
    const deposit = {
      id: "deposit-1",
      walletId: "wallet-1",
      amountMilli: 10_000,
      status: "pending",
      orderId: "kk-order",
      providerPaymentId: "pay-1",
      providerStatus: "waiting",
      ledgerEntryId: null as string | null,
      reviewReason: null as string | null,
    };
    let eventSeq = 0;
    const db = {
      select() {
        let table: unknown;
        const chain: Record<string, unknown> = {};
        const rows = () => {
          if (table === kkWalletDeposits) return [deposit];
          if (table === kkWallets) return [{ id: "wallet-1", balanceMilli: wallet.balanceMilli, participantAccountId: "account-1" }];
          if (table === kkWalletLedger) return ledger;
          if (table === kkPaymentEvents) return events;
          return [];
        };
        chain.from = (next: unknown) => {
          table = next;
          return chain;
        };
        chain.where = () => chain;
        chain.limit = () => chain;
        chain.for = () => chain;
        chain.then = (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(rows()).then(resolve, reject);
        return chain;
      },
      insert(table: unknown) {
        let row: Record<string, unknown> = {};
        const chain: Record<string, unknown> = {};
        const run = () => {
          if (table === kkPaymentEvents) {
            if (events.some((event) => event.eventKey === row.eventKey)) return [];
            eventSeq += 1;
            const event = { id: `event-${eventSeq}`, eventKey: String(row.eventKey), processedAt: null };
            events.push(event);
            return [{ id: event.id }];
          }
          if (table === kkWalletLedger) {
            const entry = { id: `ledger-${ledger.length + 1}`, entryType: String(row.entryType) };
            ledger.push(entry);
            return [{ id: entry.id }];
          }
          return [];
        };
        chain.values = (next: Record<string, unknown>) => {
          row = next;
          return chain;
        };
        chain.onConflictDoNothing = () => chain;
        chain.returning = () => Promise.resolve(run());
        chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(run()).then(resolve, reject);
        return chain;
      },
      update(table: unknown) {
        let values: Record<string, unknown> = {};
        const chain: Record<string, unknown> = {};
        const run = () => {
          if (table === kkPaymentEvents) {
            const event = events.find((item) => item.id === events[events.length - 1]?.id) ?? events[0];
            if (event) event.processedAt = values.processedAt == null ? null : String(values.processedAt);
            return [];
          }
          if (table === kkWallets) {
            wallet.balanceMilli += 10_000;
            return [{ balanceMilli: wallet.balanceMilli }];
          }
          if (table === kkWalletDeposits) {
            Object.assign(deposit, values);
            return [];
          }
          return [];
        };
        chain.set = (next: Record<string, unknown>) => {
          values = next;
          return chain;
        };
        chain.where = () => chain;
        chain.returning = () => Promise.resolve(run());
        chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(run()).then(resolve, reject);
        return chain;
      },
      transaction(fn: (tx: typeof db) => Promise<unknown>) {
        return fn(db);
      },
    };
    const bindTestDatabase = useDatabaseForTests;
    bindTestDatabase(db as unknown as Db);
    return { wallet, ledger, events, deposit };
  }

  function useEnv(env: Record<string, string>) {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  }

  async function postIpn(body: string) {
    const signature = signIpnPayload(JSON.parse(body), ipnSecret);
    return nowPaymentsWebhook(new Request("https://example.com/api/webhooks/nowpayments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nowpayments-sig": signature,
      },
      body,
    }));
  }

  it("keeps a signed finished USDT TRC20 IPN unprocessed and uncredited while deposits are disabled", async () => {
    const raw = JSON.stringify(payload);
    expect(verifyIpnSignature(JSON.parse(raw), signIpnPayload(JSON.parse(raw), ipnSecret), ipnSecret)).toBe(true);
    expect(readNowPaymentsConfig(disabledEnv).depositsEnabled).toBe(false);
    const state = harness();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(finishedPayment(), { status: 200 }));
    useEnv(disabledEnv);

    const first = await postIpn(raw);
    const retry = await postIpn(raw);
    const reordered = await postIpn(JSON.stringify({
      outcome_currency: "usdttrc20",
      outcome_amount: 10,
      actually_paid: 10,
      pay_amount: 10,
      price_currency: "usd",
      pay_currency: "usdttrc20",
      payment_status: "finished",
      order_id: "kk-order",
      payment_id: "pay-1",
    }));

    expect(first.status).toBe(503);
    expect(await first.json()).toEqual({ error: "deposits_disabled" });
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(retry.status).toBe(503);
    expect(await retry.json()).toEqual({ error: "deposits_disabled" });
    expect(reordered.status).toBe(503);
    expect(state.wallet.balanceMilli).toBe(0);
    expect(state.ledger).toEqual([]);
    expect(state.deposit.status).toBe("pending");
    expect(state.deposit.ledgerEntryId).toBeNull();
    expect(state.events).toHaveLength(2);
    expect(state.events.every((event) => event.processedAt == null)).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before storing an event", async () => {
    const state = harness();
    useEnv(disabledEnv);
    const response = await nowPaymentsWebhook(new Request("https://example.com/api/webhooks/nowpayments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nowpayments-sig": "ab",
      },
      body: JSON.stringify(payload),
    }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_signature" });
    expect(state.events).toEqual([]);
    expect(state.wallet.balanceMilli).toBe(0);
  });

  function providerPayment(payCurrency = "usdttrc20") {
    return {
      paymentId: "pay-1",
      orderId: "kk-order",
      paymentStatus: "finished",
      payCurrency,
      payAmount: "10",
      actuallyPaid: "10",
      outcomeAmount: "10",
      outcomeCurrency: payCurrency,
      parentPaymentId: null,
      priceCurrency: "usd",
    };
  }

  function providerClient(payCurrency = "usdttrc20") {
    const calls = { count: 0 };
    const client = {
      async getPayment() {
        calls.count += 1;
        return providerPayment(payCurrency);
      },
    } as unknown as NowPaymentsClient;
    return { calls, client };
  }

  it("does not let participant refresh credit a finished deposit while deposits are disabled", async () => {
    const state = harness();
    const { calls, client } = providerClient();
    useEnv(disabledEnv);

    await expect(refreshUsdtDeposit("account-1", "deposit-1", {
      config: readNowPaymentsConfig(disabledEnv),
      client,
    })).rejects.toMatchObject({ code: "CONFIGURATION_UNAVAILABLE", status: 503 });

    expect(calls.count).toBe(0);
    expect(state.wallet.balanceMilli).toBe(0);
    expect(state.ledger).toEqual([]);
    expect(state.deposit.status).toBe("pending");
    expect(state.deposit.ledgerEntryId).toBeNull();
  });

  it("does not credit a stored IPN when deposits are enabled until refresh validates it", async () => {
    const raw = JSON.stringify(payload);
    const state = harness();
    const { calls, client } = providerClient();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(finishedPayment(), { status: 200 }));
    useEnv(disabledEnv);

    expect((await postIpn(raw)).status).toBe(503);
    const enabledEnv = { ...disabledEnv, NOWPAYMENTS_DEPOSITS_ENABLED: "true" };
    useEnv(enabledEnv);
    expect(readNowPaymentsConfig(enabledEnv).depositsEnabled).toBe(true);
    expect(state.wallet.balanceMilli).toBe(0);

    const replay = await postIpn(raw);
    const replayAgain = await postIpn(raw);

    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({ received: true, reconciliationRequired: true });
    expect(replayAgain.status).toBe(200);
    expect(await replayAgain.json()).toEqual({ received: true, reconciliationRequired: true });
    const reordered = await postIpn(JSON.stringify({
      order_id: "kk-order",
      payment_id: "pay-1",
      payment_status: "finished",
      pay_currency: "usdttrc20",
      price_currency: "usd",
      pay_amount: 10,
      actually_paid: 10,
      outcome_amount: 10,
      outcome_currency: "usdttrc20",
    }));
    expect(reordered.status).toBe(200);
    expect(await reordered.json()).toEqual({ received: true, reconciliationRequired: true });
    expect(state.wallet.balanceMilli).toBe(0);
    expect(state.ledger).toEqual([]);
    expect(state.deposit.status).toBe("pending");
    expect(state.events.every((event) => event.processedAt == null)).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();

    const refreshed = await refreshUsdtDeposit("account-1", "deposit-1", {
      config: readNowPaymentsConfig(enabledEnv),
      client,
    });
    const again = await refreshUsdtDeposit("account-1", "deposit-1", {
      config: readNowPaymentsConfig(enabledEnv),
      client,
    });

    expect(refreshed.providerStatus).toBe("finished");
    expect(again.providerStatus).toBe("finished");
    expect(calls.count).toBe(2);
    expect(state.wallet.balanceMilli).toBe(10_000);
    expect(state.ledger).toEqual([{ id: "ledger-1", entryType: "deposit" }]);
    expect(state.deposit.status).toBe("completed");
    expect(state.deposit.ledgerEntryId).toBe("ledger-1");
  });

  it("credits a newly delivered finished IPN once deposits are already enabled", async () => {
    const raw = JSON.stringify(payload);
    const state = harness();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(finishedPayment(), { status: 200 }));
    useEnv({ ...disabledEnv, NOWPAYMENTS_DEPOSITS_ENABLED: "true" });

    const credited = await postIpn(raw);
    const duplicate = await postIpn(raw);

    expect(credited.status).toBe(200);
    expect(await credited.json()).toEqual({ received: true });
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toEqual({ duplicate: true });
    expect(state.wallet.balanceMilli).toBe(10_000);
    expect(state.ledger).toEqual([{ id: "ledger-1", entryType: "deposit" }]);
    expect(state.events.map((event) => event.processedAt)).toEqual([expect.any(String)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not credit a wrong-network deposit when refresh runs after deposits are enabled", async () => {
    const state = harness();
    const { client } = providerClient("usdterc20");
    useEnv({ ...disabledEnv, NOWPAYMENTS_DEPOSITS_ENABLED: "true" });

    await refreshUsdtDeposit("account-1", "deposit-1", {
      config: readNowPaymentsConfig({ ...disabledEnv, NOWPAYMENTS_DEPOSITS_ENABLED: "true" }),
      client,
    });

    expect(state.wallet.balanceMilli).toBe(0);
    expect(state.ledger).toEqual([]);
    expect(state.deposit.status).not.toBe("completed");
    expect(state.deposit.reviewReason).toBe("wrong_currency");
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

  it("sends the withdrawal id as unique_external_id and lists payouts by batch id", async () => {
    resetNowPaymentsAuthCache();
    const calls: string[] = [];
    const client = createNowPaymentsClient(
      { ...config, email: "wallet@example.com", password: "not-a-real-password" },
      async (input) => {
        calls.push(`${input.method} ${input.url}`);
        if (input.url.endsWith("/auth")) return { status: 200, raw: JSON.stringify({ token: "jwt-token" }) };
        if (input.method === "POST") {
          expect(input.body).toContain("\"unique_external_id\":\"11111111-1111-4111-8111-111111111111\"");
          expect(input.body).not.toContain("not-a-real-password");
          return {
            status: 200,
            raw: JSON.stringify({
              id: "batch-1",
              withdrawals: [{ id: "payout-1", batch_withdrawal_id: "batch-1", status: "CREATING", unique_external_id: "11111111-1111-4111-8111-111111111111" }],
            }),
          };
        }
        expect(input.url).toContain("/payout?batch_id=batch-1");
        return {
          status: 200,
          raw: JSON.stringify({
            payouts: [{
              id: "payout-1",
              batch_withdrawal_id: "batch-1",
              status: "FINISHED",
              currency: "usdttrc20",
              amount: "10",
              address: "T123",
              unique_external_id: "11111111-1111-4111-8111-111111111111",
              fee: "1",
            }],
          }),
        };
      },
    );
    const created = await client.createPayout({
      address: "T123",
      amountDecimal: "10",
      ipnCallbackUrl: "https://example.com/api/webhooks/nowpayments",
      uniqueExternalId: "11111111-1111-4111-8111-111111111111",
    });
    expect(created.payoutId).toBe("payout-1");
    expect(created.batchId).toBe("batch-1");
    const listed = await client.listPayouts({ batchId: "batch-1", limit: 20, page: 0 });
    expect(listed[0]?.uniqueExternalId).toBe("11111111-1111-4111-8111-111111111111");
    expect(listed[0]?.status).toBe("FINISHED");
    expect(calls.some((call) => call.startsWith("GET ") && call.includes("/payout?"))).toBe(true);
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

  it("rejects payout reconciliation from every role except super admin", async () => {
    await expect(
      reconcileWithdrawal({
        withdrawalId: "11111111-1111-4111-8111-111111111111",
        actorId: "admin",
        actorRole: "TOURNAMENT_ADMIN",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      reconcileWithdrawal({
        withdrawalId: "11111111-1111-4111-8111-111111111111",
        actorId: "admin",
        actorRole: "REVIEWER",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      reconcileWithdrawal({
        withdrawalId: "11111111-1111-4111-8111-111111111111",
        actorId: "admin",
        actorRole: "SUPPORT",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("disposable wallet database gate", () => {
  it("skips hosted databases, including CI and Neon, unless the URL is local", () => {
    expect(isDisposableWalletTestDatabase(undefined)).toBe(false);
    expect(isDisposableWalletTestDatabase("postgres://postgres:postgres@127.0.0.1:54329/kirakitah_wallet_test")).toBe(true);
    expect(isDisposableWalletTestDatabase("postgres://user:secret@ep-example.neon.tech/neondb")).toBe(false);
    expect(isDisposableWalletTestDatabase("not a url")).toBe(false);
  });
});
