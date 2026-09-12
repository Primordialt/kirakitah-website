"use client";

import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import type {
  FixtureCompetitorView,
  ParticipantFixtureDetail,
  ParticipantFixtureView,
  TournamentFixtureView,
} from "@/server/participant/participant-fixture-service";
import { useEffect, useState } from "react";

function CompetitorBlock({
  title,
  competitor,
}: {
  title: string;
  competitor: FixtureCompetitorView;
}) {
  return (
    <div>
      <p className="text-caption uppercase tracking-wide text-text-muted">{title}</p>
      {competitor.kind === "participant" ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {competitor.username ? (
              <span className="font-medium">@{competitor.username}</span>
            ) : null}
            <VerifiedBadge verified={competitor.verified} size="sm" />
          </div>
          <p className="mt-1 text-body-sm">
            {competitor.gamerTag ?? competitor.publicCode}
          </p>
        </>
      ) : (
        <p className="mt-2 text-body-sm text-text-secondary">{competitor.label}</p>
      )}
    </div>
  );
}

export function FixtureDetailClient({ matchId }: { matchId: string }) {
  const [detail, setDetail] = useState<ParticipantFixtureDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<
        ParticipantFixtureDetail & { error?: { message?: string } }
      >(`/api/participant/fixtures/${matchId}`);

      if (cancelled) return;
      setLoading(false);

      if (!response.ok) {
        setError(apiErrorMessage(payload, "Unable to load match details."));
        return;
      }

      if (payload.tournament) {
        setDetail({
          tournament: payload.tournament,
          personal: payload.personal ?? null,
        });
      }
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

  if (error || !detail) {
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

  const { tournament, personal } = detail;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <p>
        <Link href="/matches" className="text-body-sm text-accent underline">
          ← Back to fixtures
        </Link>
      </p>

      <header>
        <p className="text-caption uppercase tracking-wide text-text-muted">
          Match {tournament.matchShortId}
        </p>
        <h1 className="mt-1 text-h2 text-text-primary">{tournament.tournamentName}</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          {tournament.phase} · {tournament.roundLabel}
          {tournament.podNumber != null ? ` · Pod ${tournament.podNumber}` : ""}
        </p>
        <p className="mt-2 text-body-sm">
          Status:{" "}
          <span className="font-medium text-text-primary">{tournament.matchStatusLabel}</span>
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface-elevated p-5">
        <h2 className="text-h4 text-text-primary">Players</h2>
        {personal ? (
          <PersonalMatchPlayers personal={personal} />
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <CompetitorBlock title="Player A" competitor={tournament.competitorA} />
            <CompetitorBlock title="Player B" competitor={tournament.competitorB} />
          </div>
        )}
      </section>

      <ScheduleSection fixture={tournament} />

      {tournament.section === "completed" ? (
        <ResultSection tournament={tournament} personal={personal} />
      ) : null}
    </div>
  );
}

function PersonalMatchPlayers({ personal }: { personal: ParticipantFixtureView }) {
  return (
    <div className="mt-4 grid gap-6 sm:grid-cols-2">
      <div>
        <p className="text-caption uppercase tracking-wide text-text-muted">You</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {personal.yourUsername ? (
            <span className="font-medium">@{personal.yourUsername}</span>
          ) : null}
          <VerifiedBadge verified={personal.yourVerified} size="sm" />
        </div>
        <p className="mt-1 text-body-sm">{personal.yourGamerTag}</p>
      </div>
      <div>
        <p className="text-caption uppercase tracking-wide text-text-muted">Opponent</p>
        {personal.opponentKind === "participant" ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {personal.opponentUsername ? (
                <span className="font-medium">@{personal.opponentUsername}</span>
              ) : null}
              <VerifiedBadge verified={personal.opponentVerified} size="sm" />
            </div>
            <p className="mt-1 text-body-sm">
              {personal.opponentGamerTag ?? personal.opponentPublicCode}
            </p>
          </>
        ) : (
          <p className="mt-2 text-body-sm text-text-secondary">{personal.opponentLabel}</p>
        )}
      </div>
    </div>
  );
}

function ScheduleSection({
  fixture,
}: {
  fixture: TournamentFixtureView | ParticipantFixtureView;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-5">
      <h2 className="text-h4 text-text-primary">Schedule</h2>
      {fixture.schedulePendingLabel ? (
        <p className="mt-2 text-body-sm text-text-secondary">{fixture.schedulePendingLabel}</p>
      ) : (
        <>
          <p className="mt-2 text-body-sm">{fixture.scheduledDateDisplay}</p>
          <p className="text-body-sm text-text-secondary">{fixture.scheduledTimeDisplay}</p>
        </>
      )}
      <p className="mt-1 text-caption text-text-muted">{fixture.timezoneLabel}</p>
    </section>
  );
}

function ResultSection({
  tournament,
  personal,
}: {
  tournament: TournamentFixtureView;
  personal: ParticipantFixtureView | null;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-5">
      <h2 className="text-h4 text-text-primary">Result</h2>
      {personal &&
      personal.yourScore != null &&
      personal.opponentScore != null ? (
        <>
          <p className="mt-2 text-h3 text-text-primary">
            {personal.yourScore} – {personal.opponentScore}
          </p>
          {personal.outcomeLabel ? (
            <p className="mt-2 text-body-sm font-semibold">
              Outcome: {personal.outcomeLabel}
            </p>
          ) : null}
          <p className="mt-1 text-body-sm text-text-secondary">{personal.resultLabel}</p>
        </>
      ) : tournament.scoreA != null && tournament.scoreB != null ? (
        <>
          <p className="mt-2 text-h3 text-text-primary">
            {tournament.scoreA} – {tournament.scoreB}
          </p>
          <p className="mt-1 text-body-sm text-text-secondary">{tournament.resultLabel}</p>
        </>
      ) : (
        <p className="mt-2 text-body-sm text-text-secondary">{tournament.resultLabel}</p>
      )}
    </section>
  );
}
