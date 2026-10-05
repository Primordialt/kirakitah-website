"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useCallback, useEffect, useState } from "react";
import {
  ArenaChallengeShell,
  TypeRushProtectedInput,
} from "@/components/features/arena/ArenaChallengeProtection";

type LiveState = {
  arena: {
    slug: string;
    name: string;
    kind: string;
    entryFeeKk: string;
    prizeKk: string;
    minResponsesRequired: number;
    enabled: boolean;
    paused: boolean;
  };
  playersPresent: number;
  round: {
    number: number;
    state: string;
    secondsRemaining: number | null;
    disqualifyReason: string | null;
    acceptedResponseCount: number;
    responsesRemaining: number;
    uniqueParticipantCount: number;
    roundValidity: string;
  } | null;
  question: Record<string, string> | null;
  challenge: { text: string } | null;
  winnerAnnouncement: { username: string; prizeKk: string; streak: number } | null;
  activity: Array<{ message: string; kind: string }>;
  wallet: { balanceKk: string };
};

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
    const { response, payload: body } = await participantFetch<{
      accepted?: boolean;
      isCorrect?: boolean;
      balanceAfterKk?: string;
    }>(`/api/participant/arena/${slug}/respond`, {
      method: "POST",
      body: JSON.stringify({
        payload,
        clientRequestId: crypto.randomUUID(),
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      setStatus(apiErrorMessage(body, "Submission failed."));
      return;
    }
    setStatus(
      body.isCorrect
        ? "Correct response recorded — round resolves when timer ends."
        : "Entry accepted — 0.5 KK charged.",
    );
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
  const minResponses = live.arena.minResponsesRequired;
  const accepted = round?.acceptedResponseCount ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/arena" className="text-body-sm text-accent hover:underline">
        ← All arenas
      </Link>
      <header className="rounded-xl border border-border bg-surface p-4">
        <h1 className="text-h3">{live.arena.name}</h1>
        <p className="mt-1 text-body-sm text-text-muted">
          Round #{round?.number ?? "—"} · {round?.state?.replace(/_/g, " ") ?? "waiting"}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-body-sm">
          <span>
            Responses: <strong>{accepted}</strong> / {minResponses} required
          </span>
          <span>
            Players in arena: <strong>{live.playersPresent}</strong>
          </span>
          <span>Entry: {live.arena.entryFeeKk} KK per response</span>
          <span>Prize: {live.arena.prizeKk} KK</span>
          <span>Balance: {live.wallet.balanceKk} KK</span>
        </div>
        {round?.secondsRemaining !== null && round?.secondsRemaining !== undefined ? (
          <p className="mt-3 text-h2 text-brand-primary" role="timer">
            {round.secondsRemaining}s
          </p>
        ) : null}
        {round?.state === "waiting_for_players" ? (
          <p className="mt-2 text-body-sm text-text-secondary" role="status">
            {live.playersPresent < 1
              ? "Waiting for players…"
              : "Round starting soon…"}
          </p>
        ) : null}
        {round?.roundValidity === "waiting_for_minimum_responses" &&
        round.state === "active" ? (
          <p className="mt-2 text-body-sm text-text-secondary" role="status">
            Waiting for minimum responses ({round.responsesRemaining} more needed to validate).
          </p>
        ) : null}
        {!live.arena.enabled || live.arena.paused ? (
          <p className="mt-2 text-body-sm text-warning" role="status">
            Arena is not live. An admin must enable it.
          </p>
        ) : null}
      </header>

      <p className="text-caption text-text-muted">
        Copy and paste are disabled in Arena. Play fair. Screenshots cannot be fully blocked in a
        browser.
      </p>

      {live.winnerAnnouncement ? (
        <div className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4">
          <p className="text-h4">🏆 Round winner!</p>
          <p className="mt-1 text-body-sm">
            @{live.winnerAnnouncement.username} · +{live.winnerAnnouncement.prizeKk} KK
            {live.winnerAnnouncement.streak > 1
              ? ` · 🔥 ${live.winnerAnnouncement.streak} wins in a row!`
              : ""}
          </p>
        </div>
      ) : null}

      {round?.state === "disqualified" ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-body-sm" role="status">
          ⚠️ Round disqualified
          <br />
          {round.disqualifyReason ??
            `At least ${minResponses} responses were required. Only ${accepted} were submitted.`}
          <br />
          No winner this round. Next round starts in 10 seconds.
        </p>
      ) : null}

      {round?.state === "no_winner" ? (
        <p className="rounded-lg border border-border bg-surface-muted p-3 text-body-sm" role="status">
          ⏰ Time&apos;s up! No correct answer this round.
        </p>
      ) : null}

      {live.arena.kind === "quickfire" && live.question && round?.state === "active" ? (
        <ArenaChallengeShell className="relative rounded-xl border border-border bg-surface p-4">
          <p className="text-body font-medium">{live.question.question}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
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

      {live.arena.kind === "typerush" && live.challenge && round?.state === "active" ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <ArenaChallengeShell className="relative">
            <p className="text-caption text-text-muted">Type this exactly:</p>
            <p className="mt-2 break-words text-body-sm font-medium">{live.challenge.text}</p>
          </ArenaChallengeShell>
          <label className="mt-4 block text-body-sm">
            Your attempt
            <TypeRushProtectedInput
              value={draft}
              onValueChange={setDraft}
              disabled={submitting}
              onPasteRejected={() =>
                setStatus("Please type the challenge manually.")
              }
            />
          </label>
          <Button
            className="mt-3"
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

      <section aria-label="Arena activity" className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4">Activity</h2>
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-caption text-text-muted">
          {live.activity.map((item, index) => (
            <li key={`${item.message}-${index}`}>{item.message}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
