import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { QualificationPodActions } from "@/components/admin/QualificationActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  ensureQualificationPods,
  getQualificationDashboard,
  listQualificationPods,
} from "@/server/tournament/qualification/pod-service";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { qualificationPodMembers } from "@/server/db/schema";

async function getPodMemberCounts(pods: Array<{ id: string }>) {
  const db = getDb();
  const counts = new Map<string, number>();
  for (const pod of pods) {
    const [row] = await db
      .select({ value: count() })
      .from(qualificationPodMembers)
      .where(eq(qualificationPodMembers.podId, pod.id));
    counts.set(pod.id, Number(row?.value ?? 0));
  }
  return counts;
}

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

  await ensureQualificationPods(tournamentId);
  const dashboard = await getQualificationDashboard(tournamentId);
  const pods = await listQualificationPods(tournamentId);
  const memberCounts = await getPodMemberCounts(pods);

  const canManage = roleHasPermission(session.user.role, "tournament:pod_manage");
  const canRecord = roleHasPermission(session.user.role, "tournament:result_record");

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          Tournament
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Qualification</h1>
      <p className="mt-1 text-body text-text-secondary">
        32 pods · single elimination · 1 qualifier per pod → KIRAKITAH TOP 32
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Participants</p>
          <p className="text-h3">
            {dashboard.totalParticipants} / {dashboard.targetParticipants}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Pods filled</p>
          <p className="text-h3">
            {dashboard.podsFilled} / {dashboard.targetPods}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Pods completed</p>
          <p className="text-h3">{dashboard.podsCompleted}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Qualifiers</p>
          <p className="text-h3">
            {dashboard.qualifiersProduced} / {dashboard.targetQualifiers}
          </p>
          <p className="text-body-sm text-text-muted">
            {dashboard.remainingQualifiers} remaining
          </p>
        </div>
      </section>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-body-sm">
          <thead className="bg-surface-elevated text-left text-text-muted">
            <tr>
              <th className="px-4 py-3">Pod</th>
              <th className="px-4 py-3">Players</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Host SF</th>
              <th className="px-4 py-3">Winner</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr key={pod.id} className="border-t border-border">
                <td className="px-4 py-3">Pod {pod.podNumber}</td>
                <td className="px-4 py-3">
                  {memberCounts.get(pod.id) ?? 0}/{pod.capacity}
                </td>
                <td className="px-4 py-3">{pod.status}</td>
                <td className="px-4 py-3">{pod.hostSemifinalIndex ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {pod.qualifierParticipantId
                    ? pod.qualifierParticipantId.slice(0, 8)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <QualificationPodActions
                    tournamentId={tournamentId}
                    podNumber={pod.podNumber}
                    status={pod.status}
                    canManage={canManage}
                    canRecord={canRecord}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
