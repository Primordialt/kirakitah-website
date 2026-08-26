import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import {
  QualificationBulkAdvanceButton,
  QualificationPodActions,
} from "@/components/admin/QualificationActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getTournamentById } from "@/server/tournament/participant-service";
import {
  ensureQualificationPods,
  getQualificationDashboard,
  listQualificationPodSummaries,
} from "@/server/tournament/qualification/pod-service";

export default async function AdminQualificationPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Qualification unavailable</h1>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(tournamentId);
  await ensureQualificationPods(tournamentId);
  const dashboard = await getQualificationDashboard(tournamentId);
  const pods = await listQualificationPodSummaries(tournamentId);

  const canManage = roleHasPermission(session.user.role, "tournament:pod_manage");
  const canAdvance = roleHasPermission(session.user.role, "tournament:phase_manage");

  const readinessCards = [
    {
      label: "SELECTED PARTICIPANTS",
      value: `${dashboard.selectedParticipants} / ${dashboard.selectedParticipantsTarget}`,
    },
    {
      label: "PODS READY",
      value: `${dashboard.podsReady} / ${dashboard.targetPods}`,
    },
    {
      label: "TOTAL POD CAPACITY",
      value: `${dashboard.participantsAssigned} / ${dashboard.totalPodCapacityTarget}`,
    },
    {
      label: "PARTICIPANTS UNASSIGNED",
      value: String(dashboard.participantsUnassigned),
    },
    {
      label: "MATCHES GENERATED",
      value: String(dashboard.matchesGenerated),
    },
    {
      label: "MATCHES COMPLETED",
      value: String(dashboard.matchesCompleted),
    },
    {
      label: "PODS COMPLETED",
      value: `${dashboard.podsCompleted} / ${dashboard.targetPods}`,
    },
    {
      label: "TOP 32 ADVANCED",
      value: `${dashboard.top32Advanced} / ${dashboard.top32Target}`,
    },
  ];

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          Tournament
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Qualification operations</h1>
      <p className="mt-1 text-body text-text-secondary">
        {tournament?.name ?? "KIRAKITAH GAMING 926"} · phase status:{" "}
        {dashboard.phaseStatus}
      </p>
      <p className="mt-2 text-body-sm text-text-muted">
        128 participants · 32 pods · 4 positions per pod · single elimination · 1
        qualifier per pod · KIRAKITAH TOP 32. Pairing and assignment are manually
        controlled by the tournament team.
      </p>

      <nav className="mt-4 flex flex-wrap gap-3 text-body-sm">
        <Link
          href={`/admin/tournaments/${tournamentId}/qualification/participants`}
          className="text-accent underline"
        >
          Participants
        </Link>
        <Link
          href={`/admin/tournaments/${tournamentId}/qualification/top-32`}
          className="text-accent underline"
        >
          KIRAKITAH TOP 32
        </Link>
        <Link
          href={`/admin/tournaments/${tournamentId}/phases`}
          className="text-accent underline"
        >
          Phase status
        </Link>
      </nav>

      <section aria-labelledby="qualification-readiness-heading" className="mt-6">
        <h2 id="qualification-readiness-heading" className="text-h3">
          Qualification readiness
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {readinessCards.map((card) => (
            <li
              key={card.label}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <p className="text-label tracking-wide text-text-muted">{card.label}</p>
              <p className="mt-2 text-h3">{card.value}</p>
            </li>
          ))}
        </ul>
      </section>

      {canAdvance ? (
        <section className="mt-6">
          <QualificationBulkAdvanceButton tournamentId={tournamentId} />
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-h3">Pods 1–32</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-body-sm">
            <thead className="bg-surface-elevated text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Pod</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">Matches</th>
                <th className="px-4 py-3 font-medium">Qualifier</th>
                <th className="px-4 py-3 font-medium">Readiness</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pods.map((pod) => (
                <tr key={pod.id} className="border-t border-border">
                  <td className="px-4 py-3">Pod {pod.podNumber}</td>
                  <td className="px-4 py-3">
                    {pod.memberCount} / {pod.capacity}
                  </td>
                  <td className="px-4 py-3">{pod.status}</td>
                  <td className="px-4 py-3">
                    {pod.hostConfigured
                      ? `HOST SF${pod.hostSemifinalIndex}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {pod.matchesGenerated === 0
                      ? "—"
                      : `${pod.matchesCompleted} / ${pod.matchesGenerated} completed`}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {pod.qualifierPublicCode ?? "pending"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {pod.readinessReason}
                  </td>
                  <td className="px-4 py-3">
                    <QualificationPodActions
                      tournamentId={tournamentId}
                      podNumber={pod.podNumber}
                      status={pod.status}
                      canManage={canManage}
                      canAdvance={canAdvance}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
