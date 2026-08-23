import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  getCompetitionPolicyView,
  listCompetitionPolicyHistory,
} from "@/server/tournament/rules/policy-service";
import { PolicyHistoryNote } from "@/components/admin/PolicyActions";

export default async function AdminCompetitionPolicyPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:policy_view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Policy unavailable</h1>
      </AdminShell>
    );
  }

  const view = await getCompetitionPolicyView(tournamentId, {
    actorId: session.user.id,
    actorRole: session.user.role,
    recordViewAudit: true,
  });
  const history = await listCompetitionPolicyHistory(tournamentId);
  const canManage = roleHasPermission(session.user.role, "tournament:policy_manage");

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          Tournament
        </Link>
        {" · "}
        <Link
          href={`/admin/tournaments/${tournamentId}/knockout`}
          className="text-accent underline"
        >
          Knockout
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Competition policy</h1>
      <p className="mt-1 text-body text-text-secondary">
        {view.tournamentName} · rules {view.policy.rulesVersion}
      </p>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">FINALIZED PRODUCT RULES</h2>
        <ul className="mt-3 space-y-1 text-body-sm">
          {view.finalized.map((item) => (
            <li key={item.key}>
              <span className="text-text-muted">{item.label}:</span> {String(item.value)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">PENDING PRODUCT DECISIONS</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          These are not invented. Values remain pending until Product Owner approval.
        </p>
        <ul className="mt-3 space-y-1 text-body-sm">
          {view.pending.map((item) => (
            <li key={item.key}>
              <span className="text-text-muted">{item.label}:</span> pending
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Policy history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-body-sm text-text-muted">No history snapshots yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-body-sm">
            {history.map((row) => (
              <li key={row.id}>
                {row.rulesVersion} · {new Date(row.effectiveAt).toLocaleString()} ·{" "}
                {row.changeReason}
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <PolicyHistoryNote tournamentId={tournamentId} />
        ) : (
          <p className="mt-3 text-body-sm text-text-muted">
            Only SUPER_ADMIN may append policy history snapshots.
          </p>
        )}
      </section>
    </AdminShell>
  );
}
