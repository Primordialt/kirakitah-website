import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { ParticipantFixtureView } from "@/server/participant/participant-fixture-service";

function OpponentDisplay({ fixture }: { fixture: ParticipantFixtureView }) {
  if (fixture.opponentKind === "participant") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {fixture.opponentUsername ? (
            <span className="font-medium text-text-primary">
              @{fixture.opponentUsername}
            </span>
          ) : null}
          <VerifiedBadge verified={fixture.opponentVerified} size="sm" />
          {fixture.opponentGamerTag ? (
            <span className="text-body-sm text-text-secondary">
              {fixture.opponentGamerTag}
            </span>
          ) : null}
        </div>
        {fixture.opponentPublicCode ? (
          <p className="mt-1 font-mono text-caption text-text-muted">
            {fixture.opponentPublicCode}
          </p>
        ) : null}
      </>
    );
  }

  return <p className="text-body-sm text-text-secondary">{fixture.opponentLabel}</p>;
}

export function FixtureCard({
  fixture,
  variant,
}: {
  fixture: ParticipantFixtureView;
  variant: "upcoming" | "completed";
}) {
  const isLive = fixture.matchStatus === "live";

  return (
    <article className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5">
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
          <p className="text-caption uppercase tracking-wide text-text-muted">You</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {fixture.yourUsername ? (
              <span className="font-medium text-text-primary">
                @{fixture.yourUsername}
              </span>
            ) : null}
            <VerifiedBadge verified={fixture.yourVerified} size="sm" />
          </div>
          <p className="mt-1 text-body-sm text-text-secondary">{fixture.yourGamerTag}</p>
        </div>

        <p className="text-center text-body-sm font-semibold text-text-muted sm:px-2">
          VS
        </p>

        <div>
          <p className="text-caption uppercase tracking-wide text-text-muted">
            Opponent
          </p>
          <div className="mt-1">
            <OpponentDisplay fixture={fixture} />
          </div>
        </div>
      </div>

      {variant === "upcoming" ? (
        <div className="mt-4 space-y-1">
          {fixture.schedulePendingLabel ? (
            <p className="text-body-sm text-text-secondary">
              {fixture.schedulePendingLabel}
            </p>
          ) : (
            <>
              <p className="text-body-sm font-medium text-text-primary">
                {fixture.scheduledDateDisplay}
              </p>
              <p className="text-body-sm text-text-secondary">
                {fixture.scheduledTimeDisplay}
              </p>
            </>
          )}
          <p className="text-caption text-text-muted">{fixture.timezoneLabel}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-1">
          {fixture.yourScore != null && fixture.opponentScore != null ? (
            <p className="text-h4 text-text-primary">
              {fixture.yourScore}{" "}
              <span className="text-body text-text-muted">vs</span>{" "}
              {fixture.opponentScore}
            </p>
          ) : null}
          {fixture.outcomeLabel ? (
            <p className="text-body-sm font-semibold text-text-primary">
              Result: {fixture.outcomeLabel}
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
