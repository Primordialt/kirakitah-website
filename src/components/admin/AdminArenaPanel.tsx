"use client";

import { Button } from "@/components/ui";
import { useEffect, useState } from "react";

type LiveRound = {
  roundNumber: number;
  state: string;
  secondsRemaining: number | null;
  acceptedResponseCount: number;
  responsesRemaining: number;
  uniqueParticipantCount: number;
  candidateWinnerUsername: string | null;
  totalKkCollectedKk: string;
  prizeAwardedKk: string;
  roundValidity: string;
  disqualifyReason: string | null;
};

type HistoryRow = {
  roundNumber: number;
  state: string;
  acceptedResponseCount: number;
  uniqueResponderCount: number | null;
  totalKkCollectedKk: string;
  kkAwardedKk: string;
  winnerUsername: string | null;
  disqualifyReason: string | null;
  startsAt: string | null;
  resolvedAt: string | null;
};

type ArenaRow = {
  slug: string;
  name: string;
  enabled: boolean;
  paused: boolean;
  entryFeeKk: string;
  prizeKk: string;
  minResponsesRequired: number;
  playersPresent: number;
  liveRound: LiveRound | null;
  roundHistory: HistoryRow[];
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
          <p className="mt-1 text-body-sm text-text-muted">
            {arena.playersPresent} in arena · min {arena.minResponsesRequired} charged responses ·
            entry {arena.entryFeeKk} KK · prize {arena.prizeKk} KK
          </p>
          {arena.liveRound ? (
            <dl className="mt-4 grid gap-2 rounded-lg border border-border bg-surface-muted p-3 text-body-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">Round</dt>
                <dd className="font-semibold">#{arena.liveRound.roundNumber}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Responses</dt>
                <dd className="font-semibold">
                  {arena.liveRound.acceptedResponseCount} / {arena.minResponsesRequired}
                  {arena.liveRound.responsesRemaining > 0
                    ? ` (${arena.liveRound.responsesRemaining} remaining)`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Unique participants</dt>
                <dd className="font-semibold">{arena.liveRound.uniqueParticipantCount}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Time left</dt>
                <dd className="font-semibold">
                  {arena.liveRound.secondsRemaining !== null
                    ? `${arena.liveRound.secondsRemaining}s`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">KK collected</dt>
                <dd className="font-semibold">{arena.liveRound.totalKkCollectedKk} KK</dd>
              </div>
              <div>
                <dt className="text-text-muted">Winner candidate</dt>
                <dd className="font-semibold">
                  {arena.liveRound.candidateWinnerUsername
                    ? `@${arena.liveRound.candidateWinnerUsername}`
                    : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-muted">Status</dt>
                <dd className="font-semibold uppercase">
                  {arena.liveRound.roundValidity === "waiting_for_minimum_responses"
                    ? "WAITING FOR MINIMUM RESPONSES"
                    : arena.liveRound.state.replace(/_/g, " ")}
                </dd>
              </div>
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
                    <th className="py-1 pr-2">Responses</th>
                    <th className="py-1 pr-2">Unique</th>
                    <th className="py-1 pr-2">Collected</th>
                    <th className="py-1 pr-2">Awarded</th>
                    <th className="py-1 pr-2">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {arena.roundHistory.slice(0, 10).map((row) => (
                    <tr key={row.roundNumber} className="border-t border-border">
                      <td className="py-1 pr-2">{row.roundNumber}</td>
                      <td className="py-1 pr-2">{row.state}</td>
                      <td className="py-1 pr-2">{row.acceptedResponseCount}</td>
                      <td className="py-1 pr-2">{row.uniqueResponderCount ?? "—"}</td>
                      <td className="py-1 pr-2">{row.totalKkCollectedKk}</td>
                      <td className="py-1 pr-2">{row.kkAwardedKk}</td>
                      <td className="py-1 pr-2">{row.winnerUsername ? `@${row.winnerUsername}` : "—"}</td>
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
        Unique participant counts are for fraud monitoring only. Round validity requires{" "}
        {arenas[0]?.minResponsesRequired ?? 10} charged responses. Production activation still
        requires compliance and payment integration review.
      </p>
    </div>
  );
}
