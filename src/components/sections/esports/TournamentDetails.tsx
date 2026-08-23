import type { Tournament } from "@/domain/tournament";
import { formatDisplayDate } from "@/lib/format-date";
import type { EsportsDetailItem } from "@/config/esports";
import { SectionShell } from "./SectionShell";

export interface TournamentDetailsProps {
  tournament: Tournament;
}

function buildDetailItems(tournament: Tournament): EsportsDetailItem[] {
  return [
    { label: "GAME", value: tournament.game },
    { label: "FORMAT", value: tournament.format },
    { label: "MINIMUM AGE", value: `${tournament.minimumAge}+` },
    { label: "PLAYERS", value: `Target: ${tournament.targetPlayers}` },
    { label: "QUALIFIED", value: String(tournament.qualificationTarget) },
    { label: "PRIZE", value: tournament.grandPrize },
    { label: "CHAMPION", value: String(tournament.championCount) },
    {
      label: "COMMENCEMENT",
      value: formatDisplayDate(tournament.commencementDate),
    },
  ];
}

export function TournamentDetails({ tournament }: TournamentDetailsProps) {
  const items = buildDetailItems(tournament);

  return (
    <SectionShell
      id="tournament-details"
      ariaLabelledby="tournament-details-heading"
    >
      <div className="flex flex-col gap-10">
        <div className="max-w-2xl">
          <p className="text-label font-semibold tracking-[0.2em] text-accent">
            {tournament.name}
          </p>
          <h2
            id="tournament-details-heading"
            className="mt-3 text-h2 text-text-primary"
          >
            {tournament.competitionTitle}
          </h2>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-surface-elevated p-5"
            >
              <dt className="text-label font-semibold tracking-[0.12em] text-text-muted">
                {item.label}
              </dt>
              <dd className="mt-2 text-body-lg font-medium text-text-primary">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionShell>
  );
}
