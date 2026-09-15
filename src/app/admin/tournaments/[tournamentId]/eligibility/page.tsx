import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { EligibilityConfigActions } from "@/components/admin/EligibilityConfigActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  getEligibilityConfigView,
  listEligibilityConfigHistory,
} from "@/server/tournament/eligibility/eligibility-config-service";
import { formatScheduleInAfricaLagos } from "@/server/tournament/scheduling/timezone";

export default async function AdminEligibilityConfigPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:eligibility_config_view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Eligibility configuration unavailable</h1>
      </AdminShell>
    );
  }

  const view = await getEligibilityConfigView(tournamentId, {
    actorId: session.user.id,
    actorRole: session.user.role,
    recordViewAudit: true,
  });
  const history = await listEligibilityConfigHistory(tournamentId);
  const canManage = roleHasPermission(
    session.user.role,
    "tournament:eligibility_config_manage",
  );

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          Tournament
        </Link>
        {" · "}
        <Link
          href={`/admin/tournaments/${tournamentId}/policy`}
          className="text-accent underline"
        >
          Competition policy
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Eligibility configuration</h1>
      <p className="mt-1 text-body text-text-secondary">
        {view.tournamentName} · rules {view.rulesVersion}
      </p>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">YouTube verification deadline</h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          Existing selected participants retain their selection until the configured
          deadline passes. When unset, no automatic penalty applies for pending YouTube
          verification.
        </p>
        <ul className="mt-3 space-y-1 text-body-sm">
          <li>
            <span className="text-text-muted">Timezone:</span> {view.timezone} (WAT)
          </li>
          <li>
            <span className="text-text-muted">Deadline:</span>{" "}
            {view.youtubeVerificationDeadlineDisplay ?? "Not configured"}
          </li>
          <li>
            <span className="text-text-muted">State:</span> {view.deadlineState}
          </li>
        </ul>
        <EligibilityConfigActions
          tournamentId={tournamentId}
          canManage={canManage}
          currentDeadlineDisplay={view.youtubeVerificationDeadlineDisplay}
        />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Configuration history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-body-sm text-text-muted">No deadline changes recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-body-sm">
            {history.map((row) => (
              <li key={row.id}>
                {row.previousDeadline
                  ? formatScheduleInAfricaLagos(row.previousDeadline)
                  : "Not configured"}{" "}
                →{" "}
                {row.newDeadline
                  ? formatScheduleInAfricaLagos(row.newDeadline)
                  : "Not configured"}{" "}
                · {row.changeReason}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
