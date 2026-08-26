import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { QualificationBulkAdvanceButton } from "@/components/admin/QualificationActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  ensureQualificationPods,
  getQualificationDashboard,
  listTop32Qualifiers,
} from "@/server/tournament/qualification/pod-service";

export default async function AdminQualificationTop32Page({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Top 32 unavailable</h1>
      </AdminShell>
    );
  }

  await ensureQualificationPods(tournamentId);
  const dashboard = await getQualificationDashboard(tournamentId);
  const qualifiers = await listTop32Qualifiers(tournamentId);
  const canAdvance = roleHasPermission(session.user.role, "tournament:phase_manage");

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
      <h1 className="mt-2 text-h2">KIRAKITAH TOP 32</h1>
      <p className="mt-2 text-body text-text-secondary">
        Derived from completed pod winners only. Do not advance before a pod is
        completed.
      </p>
      <p className="mt-2 text-body-sm text-text-muted">
        Advanced {dashboard.top32Advanced} / {dashboard.top32Target} · Completed
        pods with qualifier {qualifiers.length} / {dashboard.targetPods}
      </p>

      {canAdvance ? (
        <section className="mt-6">
          <QualificationBulkAdvanceButton tournamentId={tournamentId} />
        </section>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-body-sm">
          <thead className="bg-surface-elevated text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Seed</th>
              <th className="px-4 py-3 font-medium">Public code</th>
              <th className="px-4 py-3 font-medium">Gamer tag</th>
              <th className="px-4 py-3 font-medium">Source pod</th>
              <th className="px-4 py-3 font-medium">Eligibility</th>
              <th className="px-4 py-3 font-medium">Advancement</th>
            </tr>
          </thead>
          <tbody>
            {qualifiers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-text-muted">
                  No completed pod winners yet.
                </td>
              </tr>
            ) : (
              qualifiers.map((row) => (
                <tr
                  key={`${row.podNumber}-${row.qualifierParticipantId}`}
                  className="border-t border-border"
                >
                  <td className="px-4 py-3">{row.seed}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.publicCode ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.gamerTag}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tournaments/${tournamentId}/qualification/pods/${row.podNumber}`}
                      className="text-accent underline"
                    >
                      Pod {row.podNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {row.eligible ? "Eligible" : "Not eligible"}
                  </td>
                  <td className="px-4 py-3">
                    {row.advancedToTop32 ? "Advanced" : "Pending advancement"}
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
