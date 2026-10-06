"use client";

import Link from "next/link";
import { participantFetch } from "@/lib/participant/api";
import { useCallback, useEffect, useState } from "react";

type ArenaCard = {
  slug: string;
  name: string;
  kind: string;
  description: string;
  enabled: boolean;
  paused: boolean;
  entryFeeKk: string;
  prizeKk: string;
};

function arenaStatusLabel(arena: Pick<ArenaCard, "enabled" | "paused">): string {
  if (!arena.enabled) return "Offline";
  if (arena.paused) return "Paused";
  return "Active";
}

export function ArenaDirectoryClient() {
  const [arenas, setArenas] = useState<ArenaCard[]>([]);
  const [walletKk, setWalletKk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ response, payload }, walletRes] = await Promise.all([
      participantFetch<{ arenas?: ArenaCard[] }>("/api/participant/arena"),
      participantFetch<{ wallet?: { balanceKk: string } }>("/api/participant/wallet"),
    ]);
    setLoading(false);
    if (response.ok) setArenas(payload.arenas ?? []);
    if (walletRes.response.ok) setWalletKk(walletRes.payload.wallet?.balanceKk ?? "0");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
          KIRAKITAH Arena
        </p>
        <h1 className="text-h2 text-text-primary">Think fast. Type faster. Win KK.</h1>
        <p className="text-body-sm text-text-secondary">
          Fastest-finger competitions.{" "}
          <Link href="/arena/rules" className="text-accent underline-offset-2 hover:underline">
            How to play
          </Link>
        </p>
        {walletKk !== null ? (
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-body-sm">
            Balance: <strong>{walletKk} KK</strong> ·{" "}
            <Link href="/wallet" className="text-accent underline-offset-2 hover:underline">
              Wallet
            </Link>
          </p>
        ) : null}
      </header>

      {loading ? (
        <p className="text-body-sm text-text-muted" role="status">
          Loading arenas…
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {arenas.map((arena) => {
            const open = arena.enabled && !arena.paused;
            return (
              <li
                key={arena.slug}
                className="flex min-w-0 flex-col rounded-xl border border-border bg-surface p-4"
              >
                <h2 className="text-h4 text-text-primary">
                  {arena.kind === "quickfire" ? "🧠 " : "⌨️ "}
                  {arena.name}
                </h2>
                <p className="mt-2 text-body-sm text-text-secondary">{arena.description}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-caption text-text-muted">
                  <div>
                    <dt>Entry</dt>
                    <dd className="font-semibold text-text-primary">{arena.entryFeeKk} KK</dd>
                  </div>
                  <div>
                    <dt>Win</dt>
                    <dd className="font-semibold text-text-primary">{arena.prizeKk} KK</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd className="font-semibold text-text-primary">{arenaStatusLabel(arena)}</dd>
                  </div>
                </dl>
                <Link
                  href={`/arena/${arena.slug}`}
                  className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-button ${
                    open
                      ? "bg-brand-primary text-white"
                      : "pointer-events-none border border-border bg-surface-muted text-text-secondary opacity-60"
                  }`}
                  aria-disabled={!open}
                >
                  Enter arena
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
