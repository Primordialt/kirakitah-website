import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getTournamentById } from "@/server/tournament/participant-service";
import { listTournamentPhases } from "@/server/tournament/competition/phase-service";
import { parseCompetitionRules } from "@/server/tournament/competition/competition-rules";

export default async function AdminTournamentsPage() {
  const session = await loadAdminSession("tournament:view");

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Tournaments unavailable</h1>
        <p className="mt-2 text-body text-text-muted">
          Registration database is not configured in this environment.
        </p>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(TOURNAMENT_EVENT_ID);
  const phases = tournament
    ? await listTournamentPhases(TOURNAMENT_EVENT_ID)
    : [];
  const rules = parseCompetitionRules(tournament?.competitionRules);

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Tournaments</h1>
      <p className="mt-1 text-body text-text-secondary">
        Competition operations foundation — mechanics pending Product Owner decisions.
      </p>

      {!tournament ? (
        <p className="mt-6 text-body-sm text-text-muted">
          No tournament record found. Apply migration 0006.
        </p>
      ) : (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">{tournament.name}</h2>
          <dl className="mt-3 grid gap-2 text-body-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd>{tournament.status}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Game</dt>
              <dd>{tournament.game}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Target / Qualifiers</dt>
              <dd>
                {tournament.targetParticipantCount} → {tournament.qualificationTarget}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Rules version</dt>
              <dd>{rules.rulesVersion}</dd>
            </div>
          </dl>
          <nav className="mt-4 flex flex-wrap gap-3 text-body-sm">
            <Link className="text-accent underline" href={`/admin/tournaments/${TOURNAMENT_EVENT_ID}`}>
              Overview
            </Link>
            <Link
              className="text-accent underline"
              href={`/admin/tournaments/${TOURNAMENT_EVENT_ID}/phases`}
            >
              Phases
            </Link>
            <Link className="text-accent underline" href="/admin/tournaments/participants">
              Participants
            </Link>
            <Link
              className="text-accent underline"
              href={`/admin/tournaments/${TOURNAMENT_EVENT_ID}/matches`}
            >
              Matches
            </Link>
          </nav>
          <p className="mt-4 text-body-sm text-text-muted">
            Phases: {phases.map((p) => p.name).join(" · ") || "none seeded"}
          </p>
        </section>
      )}
    </AdminShell>
  );
}
