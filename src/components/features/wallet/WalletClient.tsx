"use client";

import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useCallback, useEffect, useState } from "react";

type DepositRow = {
  id: string;
  amountKk: string;
  status: string;
  providerStatus: string | null;
  payAddress: string | null;
  payAmountText: string | null;
  payCurrency: string | null;
  network: string | null;
  reviewReason: string | null;
  creditedKk: string | null;
};

type WithdrawalRow = {
  id: string;
  amountKk: string;
  reviewState: string;
  network: string | null;
  providerStatus: string | null;
  providerFeeText: string | null;
  failureReason: string | null;
};

export function WalletClient() {
  const [wallet, setWallet] = useState<{
    balanceKk: string;
    availableKk: string;
    reservedKk: string;
    usdtEquivalent: string;
  } | null>(null);
  const [transactions, setTransactions] = useState<
    Array<{ signedDisplay: string; description: string; createdAt: string; id?: string }>
  >([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [policy, setPolicy] = useState<string | null>(null);
  const [depositsEnabled, setDepositsEnabled] = useState(false);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeDeposit, setActiveDeposit] = useState<DepositRow | null>(null);

  const load = useCallback(async () => {
    const { response, payload } = await participantFetch<{
      wallet?: {
        balanceKk: string;
        availableKk: string;
        reservedKk: string;
        usdtEquivalent: string;
      };
      transactions?: Array<{ signedDisplay: string; description: string; createdAt: string }>;
      deposits?: DepositRow[];
      withdrawals?: WithdrawalRow[];
      creditPolicy?: string;
      depositsEnabled?: boolean;
      payoutsEnabled?: boolean;
    }>("/api/participant/wallet");
    if (!response.ok) return;
    setWallet(payload.wallet ?? null);
    setTransactions(payload.transactions ?? []);
    setDeposits(payload.deposits ?? []);
    setWithdrawals(payload.withdrawals ?? []);
    setPolicy(payload.creditPolicy ?? null);
    setDepositsEnabled(payload.depositsEnabled === true);
    setPayoutsEnabled(payload.payoutsEnabled === true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deposit = async () => {
    setMessage(null);
    const { response, payload } = await participantFetch<{
      depositId?: string;
      message?: string;
      payAmount?: string | null;
      payAddress?: string | null;
      payCurrency?: string;
      providerStatus?: string;
      network?: string;
    }>(
      "/api/participant/wallet",
      { method: "POST", body: JSON.stringify({ action: "deposit", amountKk: amount }) },
    );
    if (!response.ok) {
      setMessage(apiErrorMessage(payload, "Deposit failed."));
      return;
    }
    setActiveDeposit({
      id: payload.depositId ?? "",
      amountKk: amount,
      status: "pending",
      providerStatus: payload.providerStatus ?? "waiting",
      payAddress: payload.payAddress ?? null,
      payAmountText: payload.payAmount ?? null,
      payCurrency: payload.payCurrency ?? "usdttrc20",
      network: payload.network ?? "USDT TRC20",
      reviewReason: null,
      creditedKk: null,
    });
    setMessage(payload.message ?? "Send the USDT amount shown to the address below.");
    setAmount("");
    void load();
  };

  const withdraw = async () => {
    setMessage(null);
    const { response, payload } = await participantFetch<{ message?: string }>(
      "/api/participant/wallet",
      {
        method: "POST",
        body: JSON.stringify({
          action: "withdraw",
          amountKk: amount,
          destinationAddress: address,
          confirmedDestination: confirmed,
          clientRequestId: crypto.randomUUID(),
        }),
      },
    );
    if (!response.ok) {
      setMessage(apiErrorMessage(payload, "Withdrawal failed."));
      return;
    }
    setMessage(payload.message ?? "Withdrawal requested.");
    setAmount("");
    setAddress("");
    setConfirmed(false);
    void load();
  };

  const refresh = async (depositId: string) => {
    await participantFetch("/api/participant/wallet", {
      method: "POST",
      body: JSON.stringify({ action: "refresh", depositId }),
    });
    void load();
  };

  const copyAddress = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setMessage("Address copied.");
  };

  const shownDeposit = activeDeposit ?? deposits.find((row) => row.payAddress && row.status === "pending") ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-h2">KK PTS Wallet</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          1 verified USDT = 1 KK. Deposits use USDT on the TRON network (TRC20).
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5">
        <p className="text-caption uppercase text-text-muted">Available KK</p>
        <p className="mt-1 text-h1 text-text-primary">{wallet?.availableKk ?? "—"} KK</p>
        <p className="text-body-sm text-text-secondary">
          ≈ {wallet?.usdtEquivalent ?? "—"} USDT available
          {wallet && wallet.reservedKk !== "0" ? ` · ${wallet.reservedKk} KK on hold` : ""}
        </p>
        <p className="mt-1 text-caption text-text-muted">Ledger balance {wallet?.balanceKk ?? "—"} KK</p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-h4">Deposit USDT TRC20</h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          {depositsEnabled
            ? "Request a deposit address. Send only USDT on TRON (TRC20) to that address."
            : "Deposits stay off until NOWPayments is configured for this environment."}
        </p>
        <label className="mt-4 block text-body-sm">
          Amount (KK)
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border px-3"
            placeholder="e.g. 10"
          />
        </label>
        <Button className="mt-3" variant="primary" onClick={() => void deposit()} disabled={!depositsEnabled}>
          Deposit
        </Button>
        {shownDeposit?.payAddress ? (
          <div className="mt-4 space-y-2 rounded-lg border border-border p-3 text-body-sm">
            <p>Network: USDT TRC20</p>
            <p>Status: {shownDeposit.providerStatus ?? shownDeposit.status}</p>
            <p>Send: {shownDeposit.payAmountText ?? "Waiting for provider amount"} {shownDeposit.payCurrency}</p>
            <p className="break-all">Address: {shownDeposit.payAddress}</p>
            <Button variant="secondary" onClick={() => void copyAddress(shownDeposit.payAddress!)}>
              Copy address
            </Button>
            <Button variant="secondary" onClick={() => void refresh(shownDeposit.id)}>
              Check payment status
            </Button>
            {shownDeposit.reviewReason ? <p>Review: {shownDeposit.reviewReason}</p> : null}
            {shownDeposit.creditedKk ? <p>Credited: {shownDeposit.creditedKk} KK</p> : null}
          </div>
        ) : null}
        {policy ? <p className="mt-3 text-caption text-text-muted">{policy}</p> : null}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-h4">Withdraw USDT TRC20</h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          {payoutsEnabled
            ? "A withdrawal reserves KK until NOWPayments reports the payout finished."
            : "You can request a withdrawal. USDT is not sent until NOWPayments payouts, IP whitelist, address whitelist, and 2FA are enabled."}
        </p>
        <label className="mt-4 block text-body-sm">
          Destination address
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border px-3"
            placeholder="TRC20 address"
            autoComplete="off"
          />
        </label>
        <label className="mt-3 flex items-start gap-2 text-body-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1"
          />
          I confirm this USDT TRC20 address. Funds sent to the wrong network cannot be recovered here.
        </label>
        <Button className="mt-3" variant="secondary" onClick={() => void withdraw()}>
          Request withdrawal
        </Button>
      </section>

      {message ? (
        <p className="text-body-sm text-text-secondary" role="status">
          {message}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4">Deposit status</h2>
        <ul className="mt-3 space-y-2">
          {deposits.length === 0 ? (
            <li className="text-body-sm text-text-muted">No deposits yet.</li>
          ) : (
            deposits.map((row) => (
              <li key={row.id} className="text-body-sm">
                {row.amountKk} KK · {row.status}
                {row.providerStatus ? ` · ${row.providerStatus}` : ""}
                {row.reviewReason ? ` · ${row.reviewReason}` : ""}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4">Withdrawals</h2>
        <ul className="mt-3 space-y-2">
          {withdrawals.length === 0 ? (
            <li className="text-body-sm text-text-muted">No withdrawals yet.</li>
          ) : (
            withdrawals.map((row) => (
              <li key={row.id} className="text-body-sm">
                {row.amountKk} KK · {row.reviewState}
                {row.providerFeeText ? ` · fee ${row.providerFeeText}` : ""}
                {row.failureReason ? ` · ${row.failureReason}` : ""}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4">Transaction history</h2>
        <ul className="mt-3 space-y-2">
          {transactions.length === 0 ? (
            <li className="text-body-sm text-text-muted">No transactions yet.</li>
          ) : (
            transactions.map((row) => (
              <li key={`${row.createdAt}-${row.description}`} className="flex justify-between gap-2 border-b border-border/50 pb-2 text-body-sm">
                <span>
                  {row.signedDisplay} KK — {row.description}
                </span>
                <time className="text-caption text-text-muted">{new Date(row.createdAt).toLocaleString()}</time>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
