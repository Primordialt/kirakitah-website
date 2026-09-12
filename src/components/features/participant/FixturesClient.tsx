"use client";

import Link from "next/link";
import { FixtureCard } from "@/components/features/participant/FixtureCard";
import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import type { ParticipantFixtureView } from "@/server/participant/participant-fixture-service";
import { useEffect, useState } from "react";

export function FixturesClient() {
  const [upcoming, setUpcoming] = useState<ParticipantFixtureView[]>([]);
  const [completed, setCompleted] = useState<ParticipantFixtureView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<{
        upcoming?: ParticipantFixtureView[];
        completed?: ParticipantFixtureView[];
      }>("/api/participant/fixtures");

      if (cancelled) return;
      setLoading(false);

      if (!response.ok) {
        setError(apiErrorMessage(payload, "Unable to load fixtures."));
        return;
      }

      setUpcoming(payload.upcoming ?? []);
      setCompleted(payload.completed ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading fixtures…
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10">
      <header>
        <h1 className="text-h2 text-text-primary">FIXTURES</h1>
        <p className="mt-2 text-body text-text-secondary">
          View your upcoming and completed tournament matches.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="upcoming-fixtures-heading">
        <h2 id="upcoming-fixtures-heading" className="text-h3 text-text-primary">
          Upcoming matches
        </h2>
        {upcoming.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-body font-medium text-text-primary">
              No upcoming matches
            </p>
            <p className="mt-2 text-body-sm text-text-secondary">
              You don&apos;t have any scheduled matches yet.
            </p>
            <Button href="/dashboard" variant="secondary" className="mt-4">
              Back to dashboard
            </Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {upcoming.map((fixture) => (
              <li key={fixture.matchId}>
                <FixtureCard fixture={fixture} variant="upcoming" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="completed-fixtures-heading">
        <h2 id="completed-fixtures-heading" className="text-h3 text-text-primary">
          Completed matches
        </h2>
        {completed.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-body font-medium text-text-primary">
              No completed matches
            </p>
            <p className="mt-2 text-body-sm text-text-secondary">
              Your completed matches will appear here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {completed.map((fixture) => (
              <li key={fixture.matchId}>
                <FixtureCard fixture={fixture} variant="completed" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-body-sm text-text-muted">
        <Link href="/tournaments" className="text-accent underline">
          View tournaments
        </Link>
      </p>
    </div>
  );
}
