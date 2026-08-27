"use client";

import { Button } from "@/components/ui";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import type { ParticipantProfileStatus } from "@/lib/participant/dashboard-status";
import { getTournamentApplyPresentation } from "@/lib/participant/profile-presentation";
import Link from "next/link";
import { useEffect, useState } from "react";

type TournamentSummary = {
  tournamentId: string;
  name: string;
  game: string;
  status: string;
  hasApplication: boolean;
  applicationStatusLabel: string | null;
  selected: boolean;
  publicCode: string | null;
  participantStatus: string | null;
};

export function TournamentsClient() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [profileStatus, setProfileStatus] =
    useState<ParticipantProfileStatus>("incomplete");
  const [completionPercent, setCompletionPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [tournamentsRes, meRes] = await Promise.all([
        participantFetch<{ tournaments?: TournamentSummary[] }>(
          "/api/participant/tournaments",
        ),
        participantFetch<{
          profile?: {
            status: ParticipantProfileStatus;
            completionPercent: number;
          };
        }>("/api/participant/me"),
      ]);

      if (cancelled) return;
      setLoading(false);

      if (!tournamentsRes.response.ok) {
        setError(
          apiErrorMessage(tournamentsRes.payload, "Unable to load tournaments."),
        );
        return;
      }

      setTournaments(tournamentsRes.payload.tournaments ?? []);
      if (meRes.payload.profile) {
        setProfileStatus(meRes.payload.profile.status);
        setCompletionPercent(meRes.payload.profile.completionPercent);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header>
        <h1 className="text-h2 text-text-primary">MY TOURNAMENTS</h1>
        <p className="mt-2 text-body text-text-secondary">
          Tournaments linked to your participant account. Profile verification is
          required before applying.
        </p>
      </header>

      {loading ? (
        <p className="text-body-sm text-text-muted" aria-live="polite">
          Loading tournaments…
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}

      {!loading && tournaments.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-body text-text-secondary">
            You haven&apos;t applied for a tournament yet.
          </p>
          <Button href="/dashboard" variant="secondary" className="mt-4">
            Go to dashboard
          </Button>
        </section>
      ) : (
        <ul className="space-y-4">
          {tournaments.map((tournament) => {
            const apply = getTournamentApplyPresentation(
              profileStatus,
              completionPercent,
              tournament.hasApplication,
              tournament.tournamentId || TOURNAMENT_EVENT_ID,
            );
            return (
              <li
                key={tournament.tournamentId}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <h2 className="text-h4 text-text-primary">{tournament.name}</h2>
                <p className="mt-1 text-body-sm text-text-secondary">
                  {tournament.game}
                </p>
                {tournament.hasApplication ? (
                  <>
                    <p className="mt-3 text-body-sm font-medium text-text-primary">
                      {tournament.applicationStatusLabel}
                    </p>
                    {tournament.selected && tournament.publicCode ? (
                      <p className="mt-1 text-body-sm text-success">
                        {tournament.participantStatus} · {tournament.publicCode}
                      </p>
                    ) : null}
                    <Button
                      href={`/tournaments/${tournament.tournamentId}`}
                      variant="secondary"
                      className="mt-4"
                    >
                      VIEW DETAILS
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-body-sm text-text-secondary">
                      {apply.description}
                    </p>
                    <Button href={apply.href} className="mt-4">
                      {apply.buttonLabel}
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-body-sm text-text-muted">
        <Link
          href="/esports"
          className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Public tournament information
        </Link>
      </p>
    </div>
  );
}
