"use client";

import { Button } from "@/components/ui";
import { useEffect, useState } from "react";

type Deposit = {
  id: string;
  username: string;
  amountKk: string;
  status: string;
  providerStatus: string | null;
  providerPaymentId: string | null;
  orderId: string | null;
  payAmountText: string | null;
  actuallyPaidText: string | null;
  outcomeAmountText: string | null;
  creditedKk: string | null;
  reviewReason: string | null;
  ledgerEntryId: string | null;
  providerFee: unknown;
};

type Withdrawal = {
  id: string;
  username: string;
  amountKk: string;
  reviewState: string;
  providerStatus: string | null;
  providerPayoutId: string | null;
  providerBatchId: string | null;
  providerFeeText: string | null;
  ledgerEntryId: string | null;
  failureReason: string | null;
  network: string | null;
};

type Exception = {
  id: string;
  providerPaymentId: string | null;
  orderId: string | null;
  providerStatus: string | null;
};

export function AdminWalletPanel() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [flags, setFlags] = useState({ depositsEnabled: false, payoutsEnabled: false });
  const [status, setStatus] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [providerPayoutId, setProviderPayoutId] = useState("");
  const [providerBatchId, setProviderBatchId] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/wallet", { credentials: "include" });
    if (!response.ok) {
      setStatus("Wallet operations are unavailable for this role.");
      return;
    }
    const payload = (await response.json()) as {
      deposits?: Deposit[];
      withdrawals?: Withdrawal[];
      exceptions?: Exception[];
      depositsEnabled?: boolean;
      payoutsEnabled?: boolean;
    };
    setDeposits(payload.deposits ?? []);
    setWithdrawals(payload.withdrawals ?? []);
    setExceptions(payload.exceptions ?? []);
    setFlags({
      depositsEnabled: payload.depositsEnabled === true,
      payoutsEnabled: payload.payoutsEnabled === true,
    });
  };

  useEffect(() => {
    void load();
  }, []);

  const refreshPayout = async (row: Withdrawal) => {
    const response = await fetch("/api/admin/wallet", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reconcile",
        withdrawalId: row.id,
        providerPayoutId: row.providerPayoutId ? undefined : providerPayoutId.trim() || undefined,
        providerBatchId: row.providerBatchId ? undefined : providerBatchId.trim() || undefined,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { outcome?: string; reason?: string } | null;
    if (!response.ok) {
      setStatus("Payout reconciliation failed. Reserved KK was not released.");
    } else if (payload?.outcome === "unresolved") {
      setStatus("The provider payout is still unresolved. Reserved KK stays reserved.");
    } else {
      setStatus("Payout reconciliation checked the provider status.");
    }
    if (response.ok) void load();
  };

  const review = async (withdrawalId: string, action: "approve" | "reject") => {
    const response = await fetch("/api/admin/wallet", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        withdrawalId,
        verificationCode: action === "approve" ? code : undefined,
      }),
    });
    setStatus(response.ok ? "Withdrawal updated." : "Withdrawal update failed.");
    if (action === "approve") setCode("");
    if (response.ok) void load();
  };

  const adjust = async (direction: "credit" | "debit") => {
    const response = await fetch("/api/admin/wallet", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        username,
        amountKk: amount,
        direction,
        reason,
        clientRequestId: crypto.randomUUID(),
      }),
    });
    setStatus(response.ok ? "Adjustment recorded." : "Adjustment failed.");
    if (response.ok) void load();
  };

  return (
    <div className="space-y-6">
      <p className="text-body-sm text-text-muted">
        Deposits {flags.depositsEnabled ? "enabled" : "disabled"} · Payouts{" "}
        {flags.payoutsEnabled ? "enabled" : "disabled until IP whitelist, address whitelist, and 2FA are ready"}
      </p>
      {status ? <p className="text-body-sm">{status}</p> : null}

      <section className="space-y-3">
        <h2 className="text-h4">Deposits</h2>
        {deposits.map((row) => (
          <article key={row.id} className="rounded-lg border border-border p-3 text-body-sm">
            <p>@{row.username} · {row.amountKk} KK · {row.status}</p>
            <p>Payment {row.providerPaymentId ?? "—"} · order {row.orderId ?? "—"}</p>
            <p>Provider {row.providerStatus ?? "—"} · paid {row.actuallyPaidText ?? "—"} · settled {row.outcomeAmountText ?? "—"}</p>
            <p>Credited {row.creditedKk ?? "—"} · ledger {row.ledgerEntryId ?? "—"}</p>
            {row.reviewReason ? <p>Review: {row.reviewReason}</p> : null}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-h4">Reconciliation exceptions</h2>
        {exceptions.length === 0 ? <p className="text-body-sm text-text-muted">None in the latest provider events.</p> : null}
        {exceptions.map((row) => (
          <article key={row.id} className="rounded-lg border border-border p-3 text-body-sm">
            <p>Payment {row.providerPaymentId ?? "—"} · order {row.orderId ?? "—"}</p>
            <p>Provider {row.providerStatus ?? "—"}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-h4">Withdrawals</h2>
        <p className="text-caption text-text-muted">
          A payout stuck after a timeout stays reserved. Paste the payout id or batch id from the NOWPayments dashboard only when this page does not already show one. Reconciliation never creates a second payout.
        </p>
        <label className="block text-body-sm">
          Provider payout id
          <input value={providerPayoutId} onChange={(event) => setProviderPayoutId(event.target.value)} autoComplete="off" className="mt-1 h-11 w-full rounded-lg border border-border px-3" />
        </label>
        <label className="block text-body-sm">
          Provider batch id
          <input value={providerBatchId} onChange={(event) => setProviderBatchId(event.target.value)} autoComplete="off" className="mt-1 h-11 w-full rounded-lg border border-border px-3" />
        </label>
        <label className="block text-body-sm">
          2FA code for payout approval
          <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" className="mt-1 h-11 w-full rounded-lg border border-border px-3" inputMode="numeric" />
        </label>
        {withdrawals.map((row) => (
          <article key={row.id} className="rounded-lg border border-border p-3 text-body-sm">
            <p>@{row.username} · {row.amountKk} KK · {row.reviewState}</p>
            <p>Payout {row.providerPayoutId ?? "—"} · batch {row.providerBatchId ?? "—"} · {row.providerStatus ?? "—"}</p>
            <p>Fee {row.providerFeeText ?? "—"} · ledger {row.ledgerEntryId ?? "—"} · {row.network ?? "USDT TRC20"}</p>
            {row.failureReason ? <p>{row.failureReason}</p> : null}
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={() => void review(row.id, "reject")}>Reject</Button>
              <Button variant="secondary" onClick={() => void refreshPayout(row)}>Reconcile payout</Button>
              <Button variant="primary" onClick={() => void review(row.id, "approve")}>Approve payout</Button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-h4">Audited adjustment</h2>
        <p className="text-caption text-text-muted">This adds a new ledger entry. Existing entries stay unchanged.</p>
        <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" className="h-11 w-full rounded-lg border border-border px-3" />
        <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="amount KK" className="h-11 w-full rounded-lg border border-border px-3" />
        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="reason" className="h-11 w-full rounded-lg border border-border px-3" />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void adjust("credit")}>Credit</Button>
          <Button variant="secondary" onClick={() => void adjust("debit")}>Debit</Button>
        </div>
      </section>
    </div>
  );
}
