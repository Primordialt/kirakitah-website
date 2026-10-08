"use client";

import { Button } from "@/components/ui";
import { useEffect, useState } from "react";

type Economics = {
  chargedEntries: number;
  entryPriceKk: string;
  grossPoolKk: string;
  currentPrizeKk?: string;
  finalPrizeKk: string | null;
  platformRemainderKk: string;
  winnerUsername: string | null;
  winningResponseId: string | null;
  settlementLedgerId: string | null;
  settlementStatus: string;
  invalidReason: string | null;
};

type LiveRound = {
  roundNumber: number;
  state: string;
  secondsRemaining: number | null;
  economics?: Economics;
};

type HistoryRow = {
  roundNumber: number;
  state: string;
  startsAt: string | null;
  resolvedAt: string | null;
  economics?: Economics;
};

type ContentPool = {
  totalCount: number;
  activeCount: number;
  poolLow: boolean;
  warning: string | null;
  recentlyUsed: Array<{
    id: string;
    label: string;
    lastRoundNumber: number | null;
    usageCount: number;
  }>;
};

type ArenaRow = {
  slug: string;
  name: string;
  enabled: boolean;
  paused: boolean;
  playersPresent: number;
  liveRound: LiveRound | null;
  roundHistory: HistoryRow[];
  contentPool?: ContentPool;
};

export function AdminArenaPanel() {
  const [arenas, setArenas] = useState<ArenaRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/admin/arena", { credentials: "include" });
    const payload = (await response.json()) as { arenas?: ArenaRow[] };
    if (response.ok) setArenas(payload.arenas ?? []);
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(interval);
  }, []);

  const patch = async (slug: string, body: object) => {
    const response = await fetch("/api/admin/arena", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...body }),
    });
    setStatus(response.ok ? "Arena updated." : "Update failed.");
    if (response.ok) void load();
  };

  return (
    <div className="space-y-6">
      {arenas.map((arena) => (
        <section
          key={arena.slug}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h2 className="text-h4">{arena.name}</h2>
          <p className="mt-1 text-body-sm text-text-muted">{arena.playersPresent} in arena</p>
          {arena.contentPool?.warning ? (
            <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-body-sm" role="status">
              {arena.contentPool.warning}
            </p>
          ) : null}
          {arena.contentPool ? (
            <p className="mt-3 text-caption text-text-muted">
              Questions/challenges: {arena.contentPool.activeCount} active / {arena.contentPool.totalCount}{" "}
              total
              {arena.contentPool.recentlyUsed[0]
                ? ` · last used round #${arena.contentPool.recentlyUsed[0].lastRoundNumber} (${arena.contentPool.recentlyUsed[0].usageCount} uses)`
                : ""}
            </p>
          ) : null}
          {arena.liveRound ? (
            <dl className="mt-4 grid gap-2 rounded-lg border border-border bg-surface-muted p-3 text-body-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">Round</dt>
                <dd className="font-semibold">#{arena.liveRound.roundNumber}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Time left</dt>
                <dd className="font-semibold">
                  {arena.liveRound.secondsRemaining !== null
                    ? `${arena.liveRound.secondsRemaining}s`
                    : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-muted">Status</dt>
                <dd className="font-semibold uppercase">{arena.liveRound.state.replace(/_/g, " ")}</dd>
              </div>
              {arena.liveRound.economics ? (
                <>
                  <div>
                    <dt className="text-text-muted">Charged entries</dt>
                    <dd className="font-semibold">{arena.liveRound.economics.chargedEntries}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Entry price</dt>
                    <dd className="font-semibold">{arena.liveRound.economics.entryPriceKk} KK</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Gross pool</dt>
                    <dd className="font-semibold">{arena.liveRound.economics.grossPoolKk} KK</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Current prize</dt>
                    <dd className="font-semibold">{arena.liveRound.economics.currentPrizeKk} KK</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Final prize</dt>
                    <dd className="font-semibold">
                      {arena.liveRound.economics.finalPrizeKk === null
                        ? "—"
                        : `${arena.liveRound.economics.finalPrizeKk} KK`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Platform remainder</dt>
                    <dd className="font-semibold">{arena.liveRound.economics.platformRemainderKk} KK</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Winner</dt>
                    <dd className="font-semibold">
                      {arena.liveRound.economics.winnerUsername
                        ? `@${arena.liveRound.economics.winnerUsername}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-text-muted">Winning response</dt>
                    <dd className="break-all font-semibold">
                      {arena.liveRound.economics.winningResponseId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Settlement</dt>
                    <dd className="font-semibold">{arena.liveRound.economics.settlementStatus}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-text-muted">Settlement transaction</dt>
                    <dd className="break-all font-semibold">
                      {arena.liveRound.economics.settlementLedgerId ?? "—"}
                    </dd>
                  </div>
                  {arena.liveRound.economics.invalidReason ? (
                    <div className="sm:col-span-2">
                      <dt className="text-text-muted">Invalid reason</dt>
                      <dd className="font-semibold">{arena.liveRound.economics.invalidReason}</dd>
                    </div>
                  ) : null}
                </>
              ) : null}
            </dl>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant={arena.enabled ? "secondary" : "primary"}
              onClick={() => void patch(arena.slug, { enabled: !arena.enabled })}
            >
              {arena.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void patch(arena.slug, { paused: !arena.paused })}
            >
              {arena.paused ? "Resume" : "Pause"}
            </Button>
          </div>
          {arena.roundHistory.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <h3 className="text-body font-medium">Recent rounds</h3>
              <table className="mt-2 w-full min-w-[640px] text-caption">
                <thead>
                  <tr className="text-left text-text-muted">
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">Status</th>
                    {arena.roundHistory.some((row) => row.economics) ? (
                      <>
                        <th className="py-1 pr-2">Entries</th>
                        <th className="py-1 pr-2">Pool</th>
                        <th className="py-1 pr-2">Prize</th>
                        <th className="py-1 pr-2">Remainder</th>
                        <th className="py-1 pr-2">Winner</th>
                        <th className="py-1 pr-2">Settlement</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {arena.roundHistory.slice(0, 10).map((row) => (
                    <tr key={row.roundNumber} className="border-t border-border">
                      <td className="py-1 pr-2">{row.roundNumber}</td>
                      <td className="py-1 pr-2">{row.state}</td>
                      {row.economics ? (
                        <>
                          <td className="py-1 pr-2">{row.economics.chargedEntries}</td>
                          <td className="py-1 pr-2">{row.economics.grossPoolKk}</td>
                          <td className="py-1 pr-2">{row.economics.finalPrizeKk ?? "—"}</td>
                          <td className="py-1 pr-2">{row.economics.platformRemainderKk}</td>
                          <td className="py-1 pr-2">
                            {row.economics.winnerUsername ? `@${row.economics.winnerUsername}` : "—"}
                          </td>
                          <td className="py-1 pr-2">{row.economics.settlementStatus}</td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ))}
      {status ? (
        <p className="text-body-sm text-text-secondary" role="status">
          {status}
        </p>
      ) : null}
      <p className="text-caption text-text-muted">
        Round money detail is visible to super admins only.
      </p>
    </div>
  );
}
