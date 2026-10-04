import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  kkWalletDeposits,
  kkWalletLedger,
  kkWallets,
  kkWalletWithdrawals,
} from "@/server/db/schema";
import { WalletError } from "@/server/wallet/errors";
import { milliToKkDisplay, parseKkInput } from "@/server/wallet/money";

type Db = ReturnType<typeof getDb>;

export type WalletSummary = {
  balanceMilli: number;
  balanceKk: string;
  usdtEquivalent: string;
};

export async function getOrCreateWallet(participantAccountId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(kkWallets)
    .where(eq(kkWallets.participantAccountId, participantAccountId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(kkWallets)
    .values({ participantAccountId })
    .onConflictDoNothing({ target: kkWallets.participantAccountId })
    .returning();

  if (created) return created;

  const [row] = await db
    .select()
    .from(kkWallets)
    .where(eq(kkWallets.participantAccountId, participantAccountId))
    .limit(1);
  if (!row) throw new WalletError("Unable to open wallet.", "WALLET_UNAVAILABLE", 503);
  return row;
}

export async function getWalletSummary(participantAccountId: string): Promise<WalletSummary> {
  const wallet = await getOrCreateWallet(participantAccountId);
  const kk = milliToKkDisplay(wallet.balanceMilli);
  return {
    balanceMilli: wallet.balanceMilli,
    balanceKk: kk,
    usdtEquivalent: kk,
  };
}

export async function listLedger(participantAccountId: string, limit = 50) {
  const wallet = await getOrCreateWallet(participantAccountId);
  const db = getDb();
  const rows = await db
    .select({
      id: kkWalletLedger.id,
      entryType: kkWalletLedger.entryType,
      amountMilli: kkWalletLedger.amountMilli,
      description: kkWalletLedger.description,
      createdAt: kkWalletLedger.createdAt,
    })
    .from(kkWalletLedger)
    .where(eq(kkWalletLedger.walletId, wallet.id))
    .orderBy(desc(kkWalletLedger.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    amountKk: milliToKkDisplay(Math.abs(row.amountMilli)),
    signedDisplay: row.amountMilli >= 0 ? `+${milliToKkDisplay(row.amountMilli)}` : `-${milliToKkDisplay(Math.abs(row.amountMilli))}`,
  }));
}

export async function debitArenaEntry(input: {
  tx: Db;
  participantAccountId: string;
  amountMilli: number;
  idempotencyKey: string;
  roundId: string;
  description: string;
}): Promise<{ ledgerId: string; balanceAfterMilli: number }> {
  const [wallet] = await input.tx
    .select()
    .from(kkWallets)
    .where(eq(kkWallets.participantAccountId, input.participantAccountId))
    .limit(1);

  if (!wallet) {
    throw new WalletError(
      "Not enough KK PTS to submit. Each response costs 0.5 KK.",
      "INSUFFICIENT_BALANCE",
      402,
    );
  }

  const now = new Date().toISOString();

  const [existing] = await input.tx
    .select({ id: kkWalletLedger.id })
    .from(kkWalletLedger)
    .where(eq(kkWalletLedger.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing) {
    const [ledger] = await input.tx
      .select()
      .from(kkWalletLedger)
      .where(eq(kkWalletLedger.id, existing.id))
      .limit(1);
    return { ledgerId: existing.id, balanceAfterMilli: ledger!.balanceAfterMilli };
  }

  const [updated] = await input.tx
    .update(kkWallets)
    .set({
      balanceMilli: sql`${kkWallets.balanceMilli} - ${input.amountMilli}`,
      updatedAt: now,
    })
    .where(
      and(
        eq(kkWallets.id, wallet.id),
        gte(kkWallets.balanceMilli, input.amountMilli),
      ),
    )
    .returning({
      balanceMilli: kkWallets.balanceMilli,
    });

  if (!updated) {
    throw new WalletError(
      "Not enough KK PTS to submit. Each response costs 0.5 KK.",
      "INSUFFICIENT_BALANCE",
      402,
    );
  }

  const balanceAfter = updated.balanceMilli;
  const balanceBefore = balanceAfter + input.amountMilli;

  const [ledger] = await input.tx
    .insert(kkWalletLedger)
    .values({
      walletId: wallet.id,
      entryType: "arena_entry",
      amountMilli: -input.amountMilli,
      balanceBeforeMilli: balanceBefore,
      balanceAfterMilli: balanceAfter,
      idempotencyKey: input.idempotencyKey,
      referenceType: "arena_round",
      referenceId: input.roundId,
      description: input.description,
      metadata: { roundId: input.roundId },
    })
    .returning({ id: kkWalletLedger.id });

  return { ledgerId: ledger!.id, balanceAfterMilli: balanceAfter };
}

export async function creditArenaPrize(input: {
  tx: Db;
  participantAccountId: string;
  amountMilli: number;
  idempotencyKey: string;
  roundId: string;
  description: string;
}): Promise<string> {
  const [wallet] = await input.tx
    .select()
    .from(kkWallets)
    .where(eq(kkWallets.participantAccountId, input.participantAccountId))
    .limit(1);
  if (!wallet) {
    throw new WalletError("Wallet unavailable.", "WALLET_UNAVAILABLE", 503);
  }

  const now = new Date().toISOString();

  const [existing] = await input.tx
    .select({ id: kkWalletLedger.id })
    .from(kkWalletLedger)
    .where(eq(kkWalletLedger.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing) return existing.id;

  const [updated] = await input.tx
    .update(kkWallets)
    .set({
      balanceMilli: sql`${kkWallets.balanceMilli} + ${input.amountMilli}`,
      updatedAt: now,
    })
    .where(eq(kkWallets.id, wallet.id))
    .returning({ balanceMilli: kkWallets.balanceMilli });

  const balanceAfter = updated!.balanceMilli;
  const balanceBefore = balanceAfter - input.amountMilli;

  const [ledger] = await input.tx
    .insert(kkWalletLedger)
    .values({
      walletId: wallet.id,
      entryType: "arena_prize",
      amountMilli: input.amountMilli,
      balanceBeforeMilli: balanceBefore,
      balanceAfterMilli: balanceAfter,
      idempotencyKey: input.idempotencyKey,
      referenceType: "arena_round",
      referenceId: input.roundId,
      description: input.description,
    })
    .returning({ id: kkWalletLedger.id });

  return ledger!.id;
}

export async function requestDeposit(participantAccountId: string, amountKkInput: string) {
  const amountMilli = parseKkInput(amountKkInput);
  const wallet = await getOrCreateWallet(participantAccountId);
  const db = getDb();
  const [deposit] = await db
    .insert(kkWalletDeposits)
    .values({
      walletId: wallet.id,
      amountMilli,
      status: "pending",
      provider: null,
    })
    .returning();

  return {
    depositId: deposit!.id,
    status: "pending" as const,
    message:
      "Top-up request recorded. KK PTS will be credited after payment provider verification. Deposits are not auto-credited in this release.",
    amountKk: milliToKkDisplay(amountMilli),
  };
}

export async function requestWithdrawal(
  participantAccountId: string,
  amountKkInput: string,
  destinationHint?: string,
) {
  const amountMilli = parseKkInput(amountKkInput);
  const wallet = await getOrCreateWallet(participantAccountId);
  if (wallet.balanceMilli < amountMilli) {
    throw new WalletError("Insufficient KK PTS for withdrawal.", "INSUFFICIENT_BALANCE", 402);
  }
  const db = getDb();
  const [withdrawal] = await db
    .insert(kkWalletWithdrawals)
    .values({
      walletId: wallet.id,
      amountMilli,
      status: "pending",
      destinationHint: destinationHint?.trim() || null,
    })
    .returning();

  return {
    withdrawalId: withdrawal!.id,
    status: "pending" as const,
    message:
      "Withdrawal request submitted for review. USDT payout requires operational payment integration.",
    amountKk: milliToKkDisplay(amountMilli),
  };
}
