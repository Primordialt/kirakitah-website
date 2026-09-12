"use client";

import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import type { ParticipantFixtureView } from "@/server/participant/participant-fixture-service";
import { useEffect, useState } from "react";

export function FixtureDetailClient({ matchId }: { matchId: string }) {
  const [fixture, setFixture] = useState<ParticipantFixtureView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<{
        fixture?: ParticipantFixtureView;
      }>(`/api/participant/fixtures/${matchId}`);

      if (cancelled) return;
      setLoading(false);

      if (!response.ok) {
        setError(apiErrorMessage(payload, "Unable to load match details."));
        return;
      }

      setFixture(payload.fixture ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading match…
      </p>
    );
  }

  if (error || !fixture) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-body-sm text-error">
          {error ?? "Match not found."}
        </p>
        <Link href="/matches" className="text-accent underline">
          Back to fixtures
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <p>
        <Link href="/matches" className="text-body-sm text-accent underline">
          ← Back to fixtures
        </Link>
      </p>

      <header>
        <p className="text-caption uppercase tracking-wide text-text-muted">
          Match {fixture.matchShortId}
        </p>
        <h1 className="mt-1 text-h2 text-text-primary">{fixture.tournamentName}</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          {fixture.phase} · {fixture.roundLabel}
          {fixture.podNumber != null ? ` · Pod ${fixture.podNumber}` : ""}
        </p>
        <p className="mt-2 text-body-sm">
          Status:{" "}
          <span className="font-medium text-text-primary">
            {fixture.matchStatusLabel}
          </span>
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface-elevated p-5">
        <h2 className="text-h4 text-text-primary">Players</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-caption uppercase tracking-wide text-text-muted">You</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {fixture.yourUsername ? (
                <span className="font-medium">@{fixture.yourUsername}</span>
              ) : null}
              <VerifiedBadge verified={fixture.yourVerified} size="sm" />
            </div>
            <p className="mt-1 text-body-sm">{fixture.yourGamerTag}</p>
            {fixture.yourPublicCode ? (
              <p className="mt-1 font-mono text-caption text-text-muted">
                {fixture.yourPublicCode}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-caption uppercase tracking-wide text-text-muted">
              Opponent
            </p>
            {fixture.opponentKind === "participant" ? (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {fixture.opponentUsername ? (
                    <span className="font-medium">@{fixture.opponentUsername}</span>
                  ) : null}
                  <VerifiedBadge verified={fixture.opponentVerified} size="sm" />
                </div>
                <p className="mt-1 text-body-sm">
                  {fixture.opponentGamerTag ?? fixture.opponentPublicCode}
                </p>
              </>
            ) : (
              <p className="mt-2 text-body-sm text-text-secondary">
                {fixture.opponentLabel}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-5">
        <h2 className="text-h4 text-text-primary">Schedule</h2>
        {fixture.schedulePendingLabel ? (
          <p className="mt-2 text-body-sm text-text-secondary">
            {fixture.schedulePendingLabel}
          </p>
        ) : (
          <>
            <p className="mt-2 text-body-sm">{fixture.scheduledDateDisplay}</p>
            <p className="text-body-sm text-text-secondary">
              {fixture.scheduledTimeDisplay}
            </p>
          </>
        )}
        <p className="mt-1 text-caption text-text-muted">{fixture.timezoneLabel}</p>
      </section>

      {fixture.section === "completed" ? (
        <section className="rounded-xl border border-border bg-surface-elevated p-5">
          <h2 className="text-h4 text-text-primary">Result</h2>
          {fixture.yourScore != null && fixture.opponentScore != null ? (
            <p className="mt-2 text-h3 text-text-primary">
              {fixture.yourScore} – {fixture.opponentScore}
            </p>
          ) : null}
          {fixture.outcomeLabel ? (
            <p className="mt-2 text-body-sm font-semibold">
              Outcome: {fixture.outcomeLabel}
            </p>
          ) : null}
          <p className="mt-1 text-body-sm text-text-secondary">{fixture.resultLabel}</p>
        </section>
      ) : null}
    </div>
  );
}
