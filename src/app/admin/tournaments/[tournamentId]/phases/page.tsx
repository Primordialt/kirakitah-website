import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { PhaseStatusActions } from "@/components/admin/PhaseStatusActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getTournamentById } from "@/server/tournament/participant-service";
import { listTournamentPhases } from "@/server/tournament/competition/phase-service";

export default async function AdminTournamentPhasesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Phases unavailable</h1>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  const phases = await listTournamentPhases(tournamentId);
  const canManage = roleHasPermission(session.user.role, "tournament:phase_manage");

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          {tournament.name}
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Phases</h1>

      <div className="mt-6 space-y-4">
        {phases.map((phase) => (
          <section
            key={phase.id}
            className="rounded-xl border border-border bg-surface-elevated p-4"
          >
            <h2 className="text-h3">
              {phase.sequence}. {phase.name}
            </h2>
            <p className="mt-1 text-body-sm text-text-secondary">
              {phase.phaseType} · {phase.status} · rules {phase.rulesVersion}
            </p>
            {canManage ? (
              <PhaseStatusActions
                tournamentId={tournamentId}
                phaseId={phase.id}
                currentStatus={phase.status}
              />
            ) : (
              <p className="mt-3 text-body-sm text-text-muted">
                Your role cannot manage phase status.
              </p>
            )}
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
