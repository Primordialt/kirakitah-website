import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type {
  FixtureCompetitorView,
  TournamentFixtureView,
} from "@/server/participant/participant-fixture-service";

function CompetitorDisplay({ competitor }: { competitor: FixtureCompetitorView }) {
  if (competitor.kind === "participant") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {competitor.username ? (
            <span className="font-medium text-text-primary">@{competitor.username}</span>
          ) : null}
          <VerifiedBadge verified={competitor.verified} size="sm" />
          {competitor.gamerTag ? (
            <span className="text-body-sm text-text-secondary">{competitor.gamerTag}</span>
          ) : null}
        </div>
        {competitor.publicCode ? (
          <p className="mt-1 font-mono text-caption text-text-muted">{competitor.publicCode}</p>
        ) : null}
      </>
    );
  }

  return <p className="text-body-sm text-text-secondary">{competitor.label}</p>;
}

export function TournamentFixtureCard({
  fixture,
  variant,
}: {
  fixture: TournamentFixtureView;
  variant: "upcoming" | "completed";
}) {
  const isLive = fixture.matchStatus === "live";

  return (
    <article
      className={`rounded-xl border bg-surface-elevated p-4 sm:p-5 ${
        fixture.isYourMatch ? "border-brand-primary/40" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            {fixture.tournamentName}
          </p>
          <p className="mt-1 text-body-sm text-text-muted">
            {fixture.phase}
            {fixture.podNumber != null ? ` · Pod ${fixture.podNumber}` : ""} ·{" "}
            {fixture.roundLabel}
          </p>
        </div>
        <span
          className={`rounded border px-2 py-0.5 text-caption uppercase tracking-wide ${
            isLive
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-text-muted"
          }`}
        >
          {isLive ? "Live" : fixture.matchStatusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <p className="text-caption uppercase tracking-wide text-text-muted">Player A</p>
          <div className="mt-1">
            <CompetitorDisplay competitor={fixture.competitorA} />
          </div>
        </div>

        <p className="text-center text-body-sm font-semibold text-text-muted sm:px-2">VS</p>

        <div>
          <p className="text-caption uppercase tracking-wide text-text-muted">Player B</p>
          <div className="mt-1">
            <CompetitorDisplay competitor={fixture.competitorB} />
          </div>
        </div>
      </div>

      {variant === "upcoming" ? (
        <div className="mt-4 space-y-1">
          {fixture.schedulePendingLabel ? (
            <p className="text-body-sm text-text-secondary">{fixture.schedulePendingLabel}</p>
          ) : (
            <>
              <p className="text-body-sm font-medium text-text-primary">
                {fixture.scheduledDateDisplay}
              </p>
              <p className="text-body-sm text-text-secondary">{fixture.scheduledTimeDisplay}</p>
            </>
          )}
          <p className="text-caption text-text-muted">{fixture.timezoneLabel}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-1">
          {fixture.scoreA != null && fixture.scoreB != null ? (
            <p className="text-h4 text-text-primary">
              {fixture.scoreA}{" "}
              <span className="text-body text-text-muted">vs</span> {fixture.scoreB}
            </p>
          ) : null}
          <p className="text-body-sm text-text-secondary">{fixture.resultLabel}</p>
          {!fixture.schedulePendingLabel ? (
            <p className="text-caption text-text-muted">
              {fixture.scheduledDateDisplay} · {fixture.scheduledTimeDisplay}
            </p>
          ) : null}
        </div>
      )}

      <Link
        href={`/matches/${fixture.matchId}`}
        className="mt-4 inline-flex min-h-11 items-center text-body-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        aria-label={`View match ${fixture.matchShortId}`}
      >
        View match
      </Link>
    </article>
  );
}
