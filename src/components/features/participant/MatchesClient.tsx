"use client";

import { Button } from "@/components/ui";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useEffect, useState } from "react";

type MatchItem = {
  matchId: string;
  roundLabel: string;
  podNumber: number | null;
  opponentGamerTag: string | null;
  opponentPublicCode: string | null;
  scheduledDisplay: string;
  timezoneLabel: string;
  matchStatus: string;
  resultLabel: string;
};

type UpcomingMatch = MatchItem & { matchId: string };

export function MatchesClient() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<{
        matches?: MatchItem[];
        upcoming?: UpcomingMatch | null;
      }>(`/api/participant/tournaments/${TOURNAMENT_EVENT_ID}/matches`);

      if (cancelled) return;
      setLoading(false);

      if (!response.ok) {
        setError(apiErrorMessage(payload, "Unable to load matches."));
        return;
      }

      setMatches(payload.matches ?? []);
      setUpcoming(payload.upcoming ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading matches…
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header>
        <h1 className="text-h2 text-text-primary">MY MATCHES</h1>
        <p className="mt-2 text-body text-text-secondary">
          Your scheduled and completed matches.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}

      {upcoming ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-h4 text-text-primary">UPCOMING MATCH</h2>
          <p className="mt-2 text-body-sm text-text-secondary">
            {upcoming.roundLabel}
            {upcoming.podNumber ? ` · Pod ${upcoming.podNumber}` : ""}
          </p>
          <p className="mt-2 text-body-sm text-text-primary">
            Opponent:{" "}
            {upcoming.opponentGamerTag ??
              upcoming.opponentPublicCode ??
              "TBD"}
          </p>
          <p className="mt-2 text-body-sm text-text-secondary">
            {upcoming.scheduledDisplay} ({upcoming.timezoneLabel})
          </p>
          <p className="mt-1 text-body-sm text-text-muted">
            Status: {upcoming.matchStatus}
          </p>
        </section>
      ) : null}

      {matches.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-body text-text-secondary">
            No matches scheduled yet.
          </p>
          <Button href="/dashboard" variant="secondary" className="mt-4">
            Back to dashboard
          </Button>
        </section>
      ) : (
        <ul className="space-y-4">
          {matches.map((match) => (
            <li
              key={match.matchId}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="text-body font-semibold text-text-primary">
                {match.roundLabel}
              </p>
              <p className="mt-1 text-body-sm text-text-secondary">
                vs{" "}
                {match.opponentGamerTag ?? match.opponentPublicCode ?? "TBD"}
              </p>
              <p className="mt-2 text-body-sm text-text-secondary">
                {match.scheduledDisplay} ({match.timezoneLabel})
              </p>
              <p className="mt-2 text-body-sm text-text-primary">
                Result: {match.resultLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
