import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getTournamentById } from "@/server/tournament/participant-service";
import {
  listKnockoutRounds,
  listTournamentPhases,
} from "@/server/tournament/competition/phase-service";
import { parseCompetitionRules } from "@/server/tournament/competition/competition-rules";

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Tournament unavailable</h1>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  const phases = await listTournamentPhases(tournamentId);
  const rules = parseCompetitionRules(tournament.competitionRules);
  const knockout = phases.find((phase) => phase.slug === "knockout");
  const rounds = knockout ? await listKnockoutRounds(knockout.id) : [];

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href="/admin/tournaments" className="text-accent underline">
          Tournaments
        </Link>
      </p>
      <h1 className="mt-2 text-h2">{tournament.name}</h1>
      <p className="mt-1 text-body text-text-secondary">
        {tournament.game} · {tournament.format} · {tournament.status}
      </p>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Competition rules</h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          Version {rules.rulesVersion}. Qualification scoring, pairing, and
          advancement are explicitly pending Product Owner decisions.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body-sm">
          <li>Qualification scoring: {rules.qualification.scoring}</li>
          <li>Qualification pairing: {rules.qualification.pairing}</li>
          <li>Qualification advancement: {rules.qualification.advancement}</li>
          <li>Knockout seeding: {rules.knockout.seeding}</li>
          <li>Knockout pairing: {rules.knockout.pairing}</li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Phases</h2>
        <ul className="mt-3 space-y-2 text-body-sm">
          {phases.map((phase) => (
            <li key={phase.id}>
              {phase.sequence}. {phase.name} ({phase.phaseType}) — {phase.status}
              {phase.participantLimit != null
                ? ` · limit ${phase.participantLimit}`
                : ""}
              {phase.qualificationTarget != null
                ? ` · qualify ${phase.qualificationTarget}`
                : ""}
            </li>
          ))}
        </ul>
        <Link
          href={`/admin/tournaments/${tournamentId}/phases`}
          className="mt-3 inline-block text-accent underline"
        >
          Manage phases
        </Link>
      </section>

      {rounds.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Knockout rounds (structure only)</h2>
          <ul className="mt-3 space-y-1 text-body-sm">
            {rounds.map((round) => (
              <li key={round.id}>
                {round.name} — {round.participantCount} players — {round.status}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-body-sm text-text-muted">
            Bracket generation and seeding are not implemented.
          </p>
        </section>
      ) : null}

      <nav className="mt-6 flex flex-wrap gap-3 text-body-sm">
        <Link
          href={`/admin/tournaments/${tournamentId}/matches`}
          className="text-accent underline"
        >
          Matches
        </Link>
        <Link href="/admin/tournaments/participants" className="text-accent underline">
          Participants
        </Link>
      </nav>
    </AdminShell>
  );
}
