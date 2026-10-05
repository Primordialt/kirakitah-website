"use client";

import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useCallback, useEffect, useState } from "react";

export function WalletClient() {
  const [wallet, setWallet] = useState<{ balanceKk: string; usdtEquivalent: string } | null>(
    null,
  );
  const [transactions, setTransactions] = useState<
    Array<{ signedDisplay: string; description: string; createdAt: string }>
  >([]);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { response, payload } = await participantFetch<{
      wallet?: { balanceKk: string; usdtEquivalent: string };
      transactions?: Array<{ signedDisplay: string; description: string; createdAt: string }>;
      depositNotice?: string;
    }>("/api/participant/wallet");
    if (response.ok) {
      setWallet(payload.wallet ?? null);
      setTransactions(payload.transactions ?? []);
      setNotice(payload.depositNotice ?? null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const action = async (actionType: "deposit" | "withdraw") => {
    setMessage(null);
    const { response, payload } = await participantFetch<{ message?: string }>(
      "/api/participant/wallet",
      {
        method: "POST",
        body: JSON.stringify({ action: actionType, amountKk: amount }),
      },
    );
    if (!response.ok) {
      setMessage(apiErrorMessage(payload, "Request failed."));
      return;
    }
    setMessage(payload.message ?? "Request recorded.");
    setAmount("");
    void load();
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-h2">KK PTS Wallet</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          Kirakitah Points for Arena play. 1 KK PTS = 1 USDT equivalent. Deposits and withdrawals
          require operational payment integration — not auto-credited in this release.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5">
        <p className="text-caption uppercase text-text-muted">KK PTS balance</p>
        <p className="mt-1 text-h1 text-text-primary">{wallet?.balanceKk ?? "—"} KK</p>
        <p className="text-body-sm text-text-secondary">
          ≈ {wallet?.usdtEquivalent ?? "—"} USDT
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void action("deposit")}>
            Top up
          </Button>
          <Button variant="secondary" onClick={() => void action("withdraw")}>
            Withdraw
          </Button>
        </div>
        <label className="mt-4 block text-body-sm">
          Amount (KK)
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border px-3"
            placeholder="e.g. 10"
          />
        </label>
        {notice ? (
          <p className="mt-3 text-caption text-text-muted" role="note">
            {notice}
          </p>
        ) : null}
        {message ? (
          <p className="mt-2 text-body-sm text-text-secondary" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4">Transaction history</h2>
        <ul className="mt-3 space-y-2">
          {transactions.length === 0 ? (
            <li className="text-body-sm text-text-muted">No transactions yet.</li>
          ) : (
            transactions.map((row) => (
              <li
                key={`${row.createdAt}-${row.description}`}
                className="flex justify-between gap-2 border-b border-border/50 pb-2 text-body-sm"
              >
                <span>
                  {row.signedDisplay} KK — {row.description}
                </span>
                <time className="text-caption text-text-muted">
                  {new Date(row.createdAt).toLocaleString()}
                </time>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
