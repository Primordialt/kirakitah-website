import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  ensureQualificationPods,
  listQualificationParticipantRoster,
} from "@/server/tournament/qualification/pod-service";

export default async function AdminQualificationParticipantsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Qualification participants unavailable</h1>
      </AdminShell>
    );
  }

  await ensureQualificationPods(tournamentId);
  const roster = await listQualificationParticipantRoster(tournamentId);
  const unassigned = roster.filter((row) => row.podNumber == null).length;

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link
          href={`/admin/tournaments/${tournamentId}/qualification`}
          className="text-accent underline"
        >
          Qualification
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Qualification participants</h1>
      <p className="mt-2 text-body text-text-secondary">
        Selected participants only. Public codes and gamer tags — no private PII.
        Assignment is manual.
      </p>
      <p className="mt-2 text-body-sm text-text-muted">
        {roster.length} selected · {unassigned} unassigned
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-body-sm">
          <thead className="bg-surface-elevated text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Public code</th>
              <th className="px-4 py-3 font-medium">Gamer tag</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Pod</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Eligibility</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-text-muted">
                  No selected participants yet.
                </td>
              </tr>
            ) : (
              roster.map((row) => (
                <tr key={row.participantId} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.publicCode ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.gamerTag}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">
                    {row.podNumber != null ? (
                      <Link
                        href={`/admin/tournaments/${tournamentId}/qualification/pods/${row.podNumber}`}
                        className="text-accent underline"
                      >
                        Pod {row.podNumber}
                      </Link>
                    ) : (
                      "Unassigned"
                    )}
                  </td>
                  <td className="px-4 py-3">{row.positionNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.eligible ? "Eligible" : "Not eligible"}
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
