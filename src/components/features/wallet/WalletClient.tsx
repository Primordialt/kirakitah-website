"use client";

import { FixtureTabGroup } from "@/components/features/participant/FixtureTabGroup";
import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { cn } from "@/lib/cn";
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

type HistoryTab = "activity" | "deposits" | "withdrawals";
type ActionPanel = "deposit" | "withdraw";

const fieldClass =
  "mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

function labelStatus(value: string | null | undefined) {
  if (!value) return "";
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [depositsEnabled, setDepositsEnabled] = useState(false);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeDeposit, setActiveDeposit] = useState<DepositRow | null>(null);
  const [action, setAction] = useState<ActionPanel | null>(null);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("activity");

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
      depositsEnabled?: boolean;
      payoutsEnabled?: boolean;
    }>("/api/participant/wallet");
    if (!response.ok) return;
    setWallet(payload.wallet ?? null);
    setTransactions(payload.transactions ?? []);
    setDeposits(payload.deposits ?? []);
    setWithdrawals(payload.withdrawals ?? []);
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
      { method: "POST", body: JSON.stringify({ action: "deposit", amountKk: depositAmount }) },
    );
    if (!response.ok) {
      setMessage(apiErrorMessage(payload, "Deposit failed."));
      return;
    }
    setActiveDeposit({
      id: payload.depositId ?? "",
      amountKk: depositAmount,
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
    setDepositAmount("");
    setAction(null);
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
          amountKk: withdrawAmount,
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
    setWithdrawAmount("");
    setAddress("");
    setConfirmed(false);
    setAction(null);
    setHistoryTab("withdrawals");
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
  const onHold = wallet != null && wallet.reservedKk !== "0";

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header>
        <h1 className="text-h2 text-text-primary">Wallet</h1>
      </header>

      <section className="rounded-2xl border border-border bg-surface px-5 py-6" aria-labelledby="wallet-balance">
        <p id="wallet-balance" className="text-caption font-semibold uppercase tracking-wide text-text-muted">
          Available
        </p>
        <p className="mt-2 text-h1 text-text-primary">
          {wallet?.availableKk ?? "—"}
          <span className="ml-2 text-h3 font-semibold text-text-secondary">KK</span>
        </p>
        <p className="mt-2 text-body-sm text-text-secondary">
          ≈ {wallet?.usdtEquivalent ?? "—"} USDT
          {onHold ? ` · ${wallet.reservedKk} KK on hold` : ""}
        </p>
        <p className="mt-3 text-caption text-text-muted">1 USDT = 1 KK · TRON (TRC20)</p>
      </section>

      {shownDeposit?.payAddress ? (
        <section className="rounded-2xl border border-border-interactive bg-surface p-5" aria-labelledby="wallet-send">
          <h2 id="wallet-send" className="text-h4 text-text-primary">
            Send USDT
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">USDT on TRON (TRC20) only.</p>
          <dl className="mt-4 space-y-3 text-body-sm">
            <div>
              <dt className="text-caption uppercase tracking-wide text-text-muted">Amount</dt>
              <dd className="mt-1 text-text-primary">
                {shownDeposit.payAmountText ?? "Waiting for the amount"} {shownDeposit.payCurrency}
              </dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-wide text-text-muted">Address</dt>
              <dd className="mt-1 break-all text-text-primary">{shownDeposit.payAddress}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-wide text-text-muted">Status</dt>
              <dd className="mt-1 text-text-primary">{labelStatus(shownDeposit.providerStatus ?? shownDeposit.status)}</dd>
            </div>
          </dl>
          {shownDeposit.reviewReason ? <p className="mt-3 text-body-sm text-text-secondary">Held for review.</p> : null}
          {shownDeposit.creditedKk ? (
            <p className="mt-3 text-body-sm text-text-secondary">Credited {shownDeposit.creditedKk} KK.</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void copyAddress(shownDeposit.payAddress!)}>
              Copy address
            </Button>
            <Button variant="secondary" onClick={() => void refresh(shownDeposit.id)}>
              Check status
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-expanded={action === "deposit"}
          aria-controls="wallet-deposit-panel"
          onClick={() => setAction((current) => (current === "deposit" ? null : "deposit"))}
          className={cn(
            "min-h-11 rounded-xl px-3 text-body-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            action === "deposit"
              ? "bg-brand-primary text-white"
              : "border border-border bg-surface text-text-primary hover:bg-surface-interactive",
          )}
        >
          Deposit
        </button>
        <button
          type="button"
          aria-expanded={action === "withdraw"}
          aria-controls="wallet-withdraw-panel"
          onClick={() => setAction((current) => (current === "withdraw" ? null : "withdraw"))}
          className={cn(
            "min-h-11 rounded-xl px-3 text-body-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            action === "withdraw"
              ? "bg-brand-primary text-white"
              : "border border-border bg-surface text-text-primary hover:bg-surface-interactive",
          )}
        >
          Withdraw
        </button>
      </div>

      {action === "deposit" ? (
        <section id="wallet-deposit-panel" className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="wallet-deposit-heading">
          <h2 id="wallet-deposit-heading" className="text-h4 text-text-primary">
            Deposit
          </h2>
          <p className="mt-2 text-body-sm text-text-secondary">
            {depositsEnabled
              ? "Request a deposit address. Send only USDT on TRON (TRC20) to that address."
              : "Deposits are not open yet."}
          </p>
          <label className="mt-4 block text-body-sm text-text-secondary" htmlFor="wallet-deposit-amount">
            Amount (KK)
            <input
              id="wallet-deposit-amount"
              type="text"
              inputMode="decimal"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              className={fieldClass}
              placeholder="10"
            />
          </label>
          <Button className="mt-4" variant="primary" onClick={() => void deposit()} disabled={!depositsEnabled}>
            Get address
          </Button>
        </section>
      ) : null}

      {action === "withdraw" ? (
        <section id="wallet-withdraw-panel" className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="wallet-withdraw-heading">
          <h2 id="wallet-withdraw-heading" className="text-h4 text-text-primary">
            Withdraw
          </h2>
          <p className="mt-2 text-body-sm text-text-secondary">
            {payoutsEnabled
              ? "KK stays on hold until the withdrawal is complete."
              : "Withdrawals are not open yet."}
          </p>
          <label className="mt-4 block text-body-sm text-text-secondary" htmlFor="wallet-withdraw-amount">
            Amount (KK)
            <input
              id="wallet-withdraw-amount"
              type="text"
              inputMode="decimal"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              className={fieldClass}
              placeholder="10"
            />
          </label>
          <label className="mt-4 block text-body-sm text-text-secondary" htmlFor="wallet-withdraw-address">
            TRC20 address
            <input
              id="wallet-withdraw-address"
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className={fieldClass}
              placeholder="T..."
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="mt-4 flex items-start gap-2 text-body-sm text-text-secondary" htmlFor="wallet-withdraw-confirm">
            <input
              id="wallet-withdraw-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            I confirm this USDT TRC20 address. Funds sent to the wrong network cannot be recovered here.
          </label>
          <Button className="mt-4" variant="primary" onClick={() => void withdraw()}>
            Request withdrawal
          </Button>
        </section>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-body-sm text-text-secondary" role="status">
          {message}
        </p>
      ) : null}

      <section className="space-y-3" aria-labelledby="wallet-history-heading">
        <h2 id="wallet-history-heading" className="text-h4 text-text-primary">
          History
        </h2>
        <FixtureTabGroup
          label="Wallet history"
          value={historyTab}
          onChange={setHistoryTab}
          options={[
            { id: "activity", label: "Activity", count: transactions.length || undefined },
            { id: "deposits", label: "Deposits", count: deposits.length || undefined },
            { id: "withdrawals", label: "Withdrawals", count: withdrawals.length || undefined },
          ]}
        />
        <div
          role="tabpanel"
          id={`wallet-history-panel-${historyTab}`}
          aria-labelledby={`wallet-history-${historyTab}`}
          className="rounded-2xl border border-border bg-surface p-4"
        >
          {historyTab === "activity" ? (
            <ul className="space-y-3">
              {transactions.length === 0 ? (
                <li className="text-body-sm text-text-muted">No activity yet.</li>
              ) : (
                transactions.map((row) => (
                  <li key={`${row.createdAt}-${row.description}`} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <p className="text-body-sm text-text-primary">
                      <span className="font-medium">{row.signedDisplay} KK</span>
                      <span className="text-text-secondary"> · {row.description}</span>
                    </p>
                    <time className="mt-1 block text-caption text-text-muted" dateTime={row.createdAt}>
                      {formatWhen(row.createdAt)}
                    </time>
                  </li>
                ))
              )}
            </ul>
          ) : null}
          {historyTab === "deposits" ? (
            <ul className="space-y-3">
              {deposits.length === 0 ? (
                <li className="text-body-sm text-text-muted">No deposits yet.</li>
              ) : (
                deposits.map((row) => (
                  <li key={row.id} className="border-b border-border/60 pb-3 text-body-sm last:border-0 last:pb-0">
                    <p className="text-text-primary">
                      <span className="font-medium">{row.amountKk} KK</span>
                      <span className="text-text-secondary"> · {labelStatus(row.status)}</span>
                    </p>
                    {row.providerStatus ? <p className="mt-1 text-caption text-text-muted">{labelStatus(row.providerStatus)}</p> : null}
                    {row.reviewReason ? <p className="mt-1 text-caption text-text-muted">Held for review</p> : null}
                  </li>
                ))
              )}
            </ul>
          ) : null}
          {historyTab === "withdrawals" ? (
            <ul className="space-y-3">
              {withdrawals.length === 0 ? (
                <li className="text-body-sm text-text-muted">No withdrawals yet.</li>
              ) : (
                withdrawals.map((row) => (
                  <li key={row.id} className="border-b border-border/60 pb-3 text-body-sm last:border-0 last:pb-0">
                    <p className="text-text-primary">
                      <span className="font-medium">{row.amountKk} KK</span>
                      <span className="text-text-secondary"> · {labelStatus(row.reviewState)}</span>
                    </p>
                    {row.providerFeeText ? <p className="mt-1 text-caption text-text-muted">Fee {row.providerFeeText}</p> : null}
                    {row.failureReason ? <p className="mt-1 text-caption text-text-muted">{row.failureReason}</p> : null}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
