import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { TournamentParticipantActions } from "@/components/admin/TournamentParticipantActions";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import { listTournamentParticipants, getTournamentById } from "@/server/tournament/participant-service";

export default async function AdminTournamentParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Participants unavailable</h1>
        <p className="mt-2 text-body text-text-muted">
          Registration database is not configured in this environment.
        </p>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(TOURNAMENT_EVENT_ID);
  const participants = await listTournamentParticipants({
    tournamentId: TOURNAMENT_EVENT_ID,
    page,
    pageSize: 25,
  });

  const canWithdraw = roleHasPermission(
    session.user.role,
    "tournament:participant_withdraw",
  );
  const canDisqualify = roleHasPermission(
    session.user.role,
    "tournament:participant_disqualify",
  );

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Tournament participants</h1>
      <p className="mt-1 text-body text-text-secondary">
        {tournament?.name ?? "KIRAKITAH GAMING 926"} · {participants.total} total
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-body-sm">
          <thead className="bg-surface-elevated text-left text-text-muted">
            <tr>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Eligibility</th>
              <th className="px-4 py-3">Selected</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-text-muted">
                  No participants selected yet.
                </td>
              </tr>
            ) : (
              participants.items.map((item) => (
                <tr key={item.participantId} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/applications/${item.applicationReference}`}
                      className="text-accent underline"
                    >
                      {item.applicationReference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{item.applicantName}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">{item.eligibilityState}</td>
                  <td className="px-4 py-3">
                    {new Date(item.selectedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <TournamentParticipantActions
                      tournamentId={TOURNAMENT_EVENT_ID}
                      participantId={item.participantId}
                      status={item.status}
                      canWithdraw={canWithdraw}
                      canDisqualify={canDisqualify}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-3 text-body-sm">
        {page > 1 ? (
          <Link href={`/admin/tournaments/participants?page=${page - 1}`}>
            Previous
          </Link>
        ) : null}
        {participants.page * participants.pageSize < participants.total ? (
          <Link href={`/admin/tournaments/participants?page=${page + 1}`}>
            Next
          </Link>
        ) : null}
      </div>
    </AdminShell>
  );
}
