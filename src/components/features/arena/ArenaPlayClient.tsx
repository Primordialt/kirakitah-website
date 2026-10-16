"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useCallback, useEffect, useState } from "react";
import {
  ArenaChallengeShell,
  TypeRushProtectedInput,
} from "@/components/features/arena/ArenaChallengeProtection";

const ARENA_MOTIVATION = [
  "MAKE IT BIG IN ONE TAP.",
  "THINK FAST. WIN BIG.",
  "YOUR NEXT WIN COULD BE BIG.",
  "ONE TAP. ONE WIN. BIG REWARD.",
  "READY TO MAKE YOUR MOVE?",
  "THE NEXT BIG WIN COULD BE YOURS.",
  "BE QUICK. BE SHARP. TAKE THE WIN.",
  "PLAY FAST. PLAY SMART.",
  "YOUR MOMENT IS NOW.",
  "STEP IN. TAKE YOUR SHOT.",
  "CAN YOU BE FIRST?",
  "ONE ROUND. ONE WINNER.",
  "HOW FAST CAN YOU BE?",
];

export function arenaMotivation(roundNumber: number): string {
  const index = Math.abs(roundNumber) % ARENA_MOTIVATION.length;
  return ARENA_MOTIVATION[index] ?? ARENA_MOTIVATION[0]!;
}

type LastRound =
  | { outcome: "winner"; username: string; prizeKk: string }
  | { outcome: "no_winner" }
  | { outcome: "ended" }
  | null;

type LiveState = {
  arena: {
    slug: string;
    name: string;
    kind: string;
    enabled: boolean;
    paused: boolean;
  };
  round: {
    number: number;
    state: string;
    secondsRemaining: number | null;
  } | null;
  question: Record<string, string> | null;
  challenge: { text: string } | null;
  winnerAnnouncement: {
    username: string;
    prizeKk: string;
    streak: number;
  } | null;
  lastRound: LastRound;
  wallet: { balanceKk: string; availableKk?: string };
};

export function formatArenaClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function ArenaPlayClient({ slug }: { slug: string }) {
  const [live, setLive] = useState<LiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { response, payload } = await participantFetch<LiveState>(
      `/api/participant/arena/${slug}`,
    );
    if (!response.ok || !payload.arena) {
      setError(apiErrorMessage(payload, "Unable to load arena."));
      return;
    }
    setLive(payload);
    setError(null);
  }, [slug]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(interval);
  }, [load]);

  const submit = async (payload: string) => {
    setSubmitting(true);
    setStatus(null);
    const { response, payload: body } = await participantFetch<{ accepted?: boolean }>(
      `/api/participant/arena/${slug}/respond`,
      {
        method: "POST",
        body: JSON.stringify({
          payload,
          clientRequestId: crypto.randomUUID(),
        }),
      },
    );
    setSubmitting(false);
    if (!response.ok) {
      setStatus(apiErrorMessage(body, "Submission failed."));
      return;
    }
    setStatus("Answer submitted.");
    setDraft("");
    void load();
  };

  if (error) {
    return (
      <p className="text-body-sm text-error" role="alert">
        {error}
      </p>
    );
  }

  if (!live) {
    return (
      <p className="text-body-sm text-text-muted" role="status">
        Loading arena…
      </p>
    );
  }

  const round = live.round;
  const winner = live.winnerAnnouncement;
  const showQuestion = live.arena.kind === "quickfire" && live.question && round?.state === "active";
  const showChallenge =
    live.arena.kind === "typerush" && live.challenge && round?.state === "active";
  const closed = !live.arena.enabled || live.arena.paused;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/arena" className="text-body-sm text-accent hover:underline">
        ← All arenas
      </Link>
      <header className="rounded-xl border border-border bg-surface p-4 text-center sm:text-left">
        <h1 className="text-h3">{live.arena.name}</h1>
        <p className="mt-1 text-body-sm font-semibold tracking-wide text-brand-primary">
          {arenaMotivation(round?.number ?? 1)}
        </p>
        <p className="mt-1 text-body-sm text-text-muted">Round #{round?.number ?? "—"}</p>
        <p className="mt-1 text-body-sm text-text-secondary">
          Balance <strong>{live.wallet.availableKk ?? live.wallet.balanceKk} KK</strong>
        </p>
        {round?.secondsRemaining !== null && round?.secondsRemaining !== undefined ? (
          <p
            className="mt-4 font-mono text-4xl font-semibold tracking-wide text-brand-primary tabular-nums"
            role="timer"
            aria-label={`${round.secondsRemaining} seconds remaining`}
          >
            {formatArenaClock(round.secondsRemaining)}
          </p>
        ) : null}
        {closed ? (
          <p className="mt-3 text-body-sm text-warning" role="status">
            This arena is not open right now.
          </p>
        ) : null}
      </header>

      {winner ? (
        <div className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4" role="status">
          {winner.streak > 1 ? (
            <>
              <p className="text-h4">🔥 @{winner.username} wins again!</p>
              <p className="mt-2 text-body-sm font-semibold">{winner.streak} WINS IN A ROW</p>
            </>
          ) : (
            <p className="text-h4">🎉 @{winner.username} WINS!</p>
          )}
          <p className="mt-2 text-body font-semibold">🏆 +{winner.prizeKk} KK</p>
          {winner.streak > 1 ? null : <p className="mt-2 text-body-sm">Congratulations!</p>}
        </div>
      ) : null}

      {live.lastRound?.outcome === "winner" ? (
        <p className="rounded-lg border border-brand-primary/30 bg-surface p-3 text-body-sm" role="status">
          🏆 LAST ROUND WINNER: @{live.lastRound.username} — {live.lastRound.prizeKk} KK
        </p>
      ) : live.lastRound?.outcome === "no_winner" ? (
        <p className="rounded-lg border border-border bg-surface-muted p-3 text-body-sm" role="status">
          LAST ROUND: NO WINNER
        </p>
      ) : live.lastRound?.outcome === "ended" ? (
        <p className="rounded-lg border border-border bg-surface-muted p-3 text-body-sm" role="status">
          LAST ROUND: ROUND ENDED
        </p>
      ) : (
        <p className="rounded-lg border border-border bg-surface-muted p-3 text-body-sm" role="status">
          THE ARENA IS LIVE.
        </p>
      )}

      {(round?.state === "countdown" || round?.state === "waiting_for_players") && !closed ? (
        <p className="text-center text-body-sm text-text-secondary" role="status">
          Get ready.
        </p>
      ) : null}

      {showQuestion ? (
        <ArenaChallengeShell className="relative rounded-xl border border-border bg-surface p-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Question</p>
          <p className="mt-2 text-body font-medium">{live.question!.question}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["A", "B", "C", "D"] as const).map((key) => (
              <Button
                key={key}
                variant="secondary"
                disabled={submitting}
                onClick={() => void submit(key)}
              >
                {key}. {live.question![`option${key}` as "optionA"]}
              </Button>
            ))}
          </div>
        </ArenaChallengeShell>
      ) : null}

      {showChallenge ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <ArenaChallengeShell className="relative">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              Type this
            </p>
            <p className="mt-2 break-words text-body font-medium">{live.challenge!.text}</p>
          </ArenaChallengeShell>
          <label className="mt-4 block text-body-sm">
            Your answer
            <TypeRushProtectedInput
              value={draft}
              onValueChange={setDraft}
              disabled={submitting}
              onPasteRejected={() => setStatus("Please type the challenge manually.")}
            />
          </label>
          <Button
            className="mt-3 w-full sm:w-auto"
            loading={submitting}
            onClick={() => void submit(draft)}
            disabled={!draft.trim()}
          >
            Submit
          </Button>
        </section>
      ) : null}

      {status ? (
        <p className="text-body-sm text-text-secondary" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
