import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { MatchResultActions } from "@/components/admin/MatchResultActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getTournamentById } from "@/server/tournament/participant-service";
import { listMatches } from "@/server/tournament/competition/match-service";

export default async function AdminTournamentMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await loadAdminSession("tournament:match_view");
  const { tournamentId } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? "1") || 1);

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Matches unavailable</h1>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  const matches = await listMatches({ tournamentId, page, pageSize: 25 });
  const canRecord = roleHasPermission(session.user.role, "tournament:result_record");
  const canCorrect = roleHasPermission(session.user.role, "tournament:result_correct");
  const canForfeit = roleHasPermission(session.user.role, "tournament:forfeit");
  const canManage = roleHasPermission(session.user.role, "tournament:match_manage");

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          {tournament.name}
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Matches</h1>
      <p className="mt-1 text-body text-text-secondary">
        Foundation view — no automatic scheduling. Live tracking is not implemented.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-body-sm">
          <thead className="bg-surface-elevated text-left text-text-muted">
            <tr>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-text-muted">
                  No matches yet.
                </td>
              </tr>
            ) : (
              matches.items.map((match) => (
                <tr key={match.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{match.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{match.status}</td>
                  <td className="px-4 py-3">
                    {match.scheduledAt
                      ? new Date(match.scheduledAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <MatchResultActions
                      tournamentId={tournamentId}
                      matchId={match.id}
                      status={match.status}
                      participantAId={match.participantAId}
                      participantBId={match.participantBId}
                      canRecord={canRecord}
                      canCorrect={canCorrect}
                      canForfeit={canForfeit}
                      canDispute={canManage}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
