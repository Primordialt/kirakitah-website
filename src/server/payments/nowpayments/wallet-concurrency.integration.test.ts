/**
 * Disposable PostgreSQL concurrency tests for wallet credits, reservations, and payout settlement.
 *
 * These tests do not run in the default `npm test` command unless a local database is provided.
 * They refuse any non-local URL so Production and hosted Neon credentials are never used.
 *
 * Setup:
 *   docker run --rm --name kirakitah-wallet-test \
 *     -e POSTGRES_PASSWORD=postgres \
 *     -e POSTGRES_DB=kirakitah_wallet_test \
 *     -p 54329:5432 postgres:16
 *   $env:KK_TEST_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54329/kirakitah_wallet_test"
 *   npx vitest run src/server/payments/nowpayments/wallet-concurrency.integration.test.ts
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useDatabaseForTests, getDb, type Db } from "@/server/db";
import { kkWalletDeposits, kkWalletLedger, kkWalletWithdrawals, kkWallets, participantAccounts } from "@/server/db/schema";
import * as schema from "@/server/db/schema";
import type { NowPaymentsClient } from "@/server/payments/nowpayments/client";
import { readNowPaymentsConfig } from "@/server/payments/nowpayments/config";
import {
  createUsdtWithdrawal,
  handleNowPaymentsIpn,
  resetWalletProviderRateLimitForTests,
} from "@/server/payments/nowpayments/service";
import { signIpnPayload } from "@/server/payments/nowpayments/signature";
import { debitArenaEntry, getOrCreateWallet } from "@/server/wallet/service";

const databaseUrl = process.env.KK_TEST_DATABASE_URL;
const localDatabase = (() => {
  if (!databaseUrl) return false;
  try {
    const host = new URL(databaseUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
})();

const secret = "wallet-integration-secret";
const address = `T${"1".repeat(33)}`;

function signed(body: Record<string, unknown>, raw = JSON.stringify(body)) {
  return { raw, signature: signIpnPayload(JSON.parse(raw) as unknown, secret) };
}

describe.skipIf(!localDatabase)("wallet postgres concurrency", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl, max: 8 });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    useDatabaseForTests(db as unknown as Db);
  }, 120_000);

  afterAll(async () => {
    useDatabaseForTests(null);
    await pool?.end();
  });

  async function account() {
    const id = randomUUID();
    const db = getDb();
    await db.insert(participantAccounts).values({
      id,
      email: `${id}@example.com`,
      emailNormalized: `${id}@example.com`,
      username: `w${id.slice(0, 8)}`,
      usernameNormalized: `w${id.slice(0, 8)}`,
      passwordHash: "integration-hash",
      emailVerifiedAt: new Date().toISOString(),
      active: true,
    });
    return id;
  }

  async function walletOf(accountId: string) {
    const [wallet] = await getDb().select().from(kkWallets).where(eq(kkWallets.participantAccountId, accountId)).limit(1);
    return wallet!;
  }

  it("credits one finished payment once under concurrent webhooks, then claws a refund once", async () => {
    const accountId = await account();
    const wallet = await getOrCreateWallet(accountId);
    const orderId = `kk-${randomUUID()}`;
    const paymentId = randomUUID();
    await getDb().insert(kkWalletDeposits).values({
      walletId: wallet.id,
      amountMilli: 10_000,
      status: "pending",
      provider: "nowpayments",
      orderId,
      providerPaymentId: paymentId,
      payCurrency: "usdttrc20",
      priceAmountText: "10",
      network: "USDT TRC20",
      providerStatus: "waiting",
    });
    const finished = {
      paymentId,
      orderId,
      paymentStatus: "finished",
      payCurrency: "usdttrc20",
      payAmount: "10",
      actuallyPaid: "10",
      outcomeAmount: "10",
      outcomeCurrency: "usdttrc20",
      parentPaymentId: null,
      priceCurrency: "usd",
      payAddress: address,
      feeCurrency: null,
      depositFee: null,
      serviceFee: null,
    };
    const client = { async getPayment() { return finished; } } as unknown as NowPaymentsClient;
    const config = readNowPaymentsConfig({
      NOWPAYMENTS_API_KEY: "test-key",
      NOWPAYMENTS_IPN_SECRET: secret,
      NOWPAYMENTS_IPN_CALLBACK_URL: "https://example.com/api/webhooks/nowpayments",
    });
    const first = signed({ payment_id: paymentId, order_id: orderId, payment_status: "finished" });
    const second = signed(
      { payment_id: paymentId, order_id: orderId, payment_status: "finished" },
      `{"order_id":${JSON.stringify(orderId)},"payment_status":"finished","payment_id":${JSON.stringify(paymentId)}}`,
    );
    await Promise.all([
      handleNowPaymentsIpn(first.raw, first.signature, { config, client }),
      handleNowPaymentsIpn(second.raw, second.signature, { config, client }),
    ]);
    const credited = await walletOf(accountId);
    const ledgers = await getDb().select().from(kkWalletLedger).where(eq(kkWalletLedger.walletId, wallet.id));
    expect(credited.balanceMilli).toBe(10_000);
    expect(credited.reservedMilli).toBe(0);
    expect(ledgers.filter((row) => row.entryType === "deposit")).toHaveLength(1);

    const refunded = { ...finished, paymentStatus: "refunded" };
    const refundClient = { async getPayment() { return refunded; } } as unknown as NowPaymentsClient;
    const refund = signed({ payment_id: paymentId, order_id: orderId, payment_status: "refunded" });
    await handleNowPaymentsIpn(refund.raw, refund.signature, { config, client: refundClient });
    await handleNowPaymentsIpn(refund.raw, refund.signature, { config, client: refundClient });
    const afterRefund = await walletOf(accountId);
    const afterLedgers = await getDb().select().from(kkWalletLedger).where(eq(kkWalletLedger.walletId, wallet.id));
    expect(afterRefund.balanceMilli).toBe(0);
    expect(afterRefund.reservedMilli).toBe(0);
    expect(afterLedgers.filter((row) => row.entryType === "deposit")).toHaveLength(1);
    expect(afterLedgers.filter((row) => row.entryType === "refund")).toHaveLength(1);
  });

  it("keeps arena spending and a withdrawal reservation from overspending", async () => {
    resetWalletProviderRateLimitForTests();
    const accountId = await account();
    const wallet = await getOrCreateWallet(accountId);
    await getDb()
      .update(kkWallets)
      .set({ balanceMilli: 10_000, reservedMilli: 0 })
      .where(eq(kkWallets.id, wallet.id));
    const config = readNowPaymentsConfig({
      NOWPAYMENTS_API_KEY: "test-key",
      NOWPAYMENTS_IPN_SECRET: secret,
      NOWPAYMENTS_IPN_CALLBACK_URL: "https://example.com/api/webhooks/nowpayments",
    });
    const client = {
      async validatePayoutAddress() {},
      async getPayoutFee() { return { fee: "1" }; },
    } as unknown as NowPaymentsClient;
    await Promise.allSettled([
      createUsdtWithdrawal(accountId, {
        amountKk: "10",
        destinationAddress: address,
        confirmedDestination: true,
        clientRequestId: randomUUID(),
      }, { config, client }),
      getDb().transaction(async (tx) => {
        await debitArenaEntry({
          tx: tx as unknown as Db,
          participantAccountId: accountId,
          amountMilli: 500,
          idempotencyKey: `arena-entry:${randomUUID()}`,
          roundId: randomUUID(),
          description: "integration arena entry",
        });
      }),
    ]);
    const after = await walletOf(accountId);
    expect(after.balanceMilli).toBeGreaterThanOrEqual(0);
    expect(after.reservedMilli).toBeGreaterThanOrEqual(0);
    expect(after.reservedMilli).toBeLessThanOrEqual(after.balanceMilli);
    expect(after.balanceMilli - after.reservedMilli).toBeGreaterThanOrEqual(0);
    expect(after.balanceMilli === 9_500 && after.reservedMilli === 0 || after.balanceMilli === 10_000 && after.reservedMilli === 10_000).toBe(true);
  });

  it("reserves a withdrawal once and settles or releases a payout once", async () => {
    resetWalletProviderRateLimitForTests();
    const accountId = await account();
    const wallet = await getOrCreateWallet(accountId);
    await getDb().update(kkWallets).set({ balanceMilli: 10_000, reservedMilli: 0 }).where(eq(kkWallets.id, wallet.id));
    const config = readNowPaymentsConfig({
      NOWPAYMENTS_API_KEY: "test-key",
      NOWPAYMENTS_IPN_SECRET: secret,
      NOWPAYMENTS_IPN_CALLBACK_URL: "https://example.com/api/webhooks/nowpayments",
    });
    const client = {
      async validatePayoutAddress() {},
      async getPayoutFee() { return { fee: "1" }; },
    } as unknown as NowPaymentsClient;
    const requestId = randomUUID();
    const [first, second] = await Promise.allSettled([
      createUsdtWithdrawal(accountId, { amountKk: "10", destinationAddress: address, confirmedDestination: true, clientRequestId: requestId }, { config, client }),
      createUsdtWithdrawal(accountId, { amountKk: "10", destinationAddress: address, confirmedDestination: true, clientRequestId: requestId }, { config, client }),
    ]);
    expect(first.status === "fulfilled" || second.status === "fulfilled").toBe(true);
    const reserved = await walletOf(accountId);
    expect(reserved.balanceMilli).toBe(10_000);
    expect(reserved.reservedMilli).toBe(10_000);

    const [withdrawal] = await getDb().select().from(kkWalletWithdrawals).where(eq(kkWalletWithdrawals.walletId, wallet.id)).limit(1);
    const payoutId = randomUUID();
    await getDb()
      .update(kkWalletWithdrawals)
      .set({ reviewState: "processing", status: "processing", providerPayoutId: payoutId, providerBatchId: randomUUID(), destinationAddress: address })
      .where(eq(kkWalletWithdrawals.id, withdrawal!.id));
    const payout = (status: string) => ({
      payoutId,
      status,
      currency: "usdttrc20",
      amount: "10",
      address,
      fee: "1",
    });
    const rejected = signed({ id: payoutId, status: "REJECTED", currency: "usdttrc20", amount: 10, address });
    const rejectedAgain = signed(
      { id: payoutId, status: "REJECTED", currency: "usdttrc20", amount: 10, address },
      JSON.stringify({ status: "REJECTED", id: payoutId, address, amount: 10, currency: "usdttrc20" }),
    );
    await handleNowPaymentsIpn(rejected.raw, rejected.signature, {
      config,
      client: { async getPayout() { return payout("REJECTED"); } } as unknown as NowPaymentsClient,
    });
    await handleNowPaymentsIpn(rejectedAgain.raw, rejectedAgain.signature, {
      config,
      client: { async getPayout() { return payout("REJECTED"); } } as unknown as NowPaymentsClient,
    });
    const released = await walletOf(accountId);
    expect(released.balanceMilli).toBe(10_000);
    expect(released.reservedMilli).toBe(0);
    const finished = signed({ id: payoutId, status: "FINISHED", currency: "usdttrc20", amount: 10, address });
    await handleNowPaymentsIpn(finished.raw, finished.signature, {
      config,
      client: { async getPayout() { return payout("FINISHED"); } } as unknown as NowPaymentsClient,
    });
    const afterLateFinish = await walletOf(accountId);
    const ledgers = await getDb().select().from(kkWalletLedger).where(eq(kkWalletLedger.walletId, wallet.id));
    expect(afterLateFinish.balanceMilli).toBe(10_000);
    expect(afterLateFinish.reservedMilli).toBe(0);
    expect(ledgers.filter((row) => row.entryType === "withdrawal")).toHaveLength(0);
  });
});
