import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import {
  QualificationAssignForm,
  QualificationMatchRecordForm,
} from "@/components/admin/QualificationActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getPodByNumber, getPodDetail } from "@/server/tournament/qualification/pod-service";
import { getPodMatchDetail } from "@/server/tournament/qualification/match-engine";

export default async function AdminQualificationPodPage({
  params,
}: {
  params: Promise<{ tournamentId: string; podNumber: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId, podNumber: podNumberStr } = await params;
  const podNumber = Number(podNumberStr);

  if (!isRegistrationBackendConfigured() || !Number.isFinite(podNumber)) {
    notFound();
  }

  const pod = await getPodByNumber(tournamentId, podNumber);
  if (!pod) notFound();

  const detail = await getPodDetail(pod.id);
  const matches = await getPodMatchDetail(pod.id);
  const canManage = roleHasPermission(session.user.role, "tournament:pod_manage");
  const canRecord = roleHasPermission(session.user.role, "tournament:result_record");

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
      <h1 className="mt-2 text-h2">Pod {podNumber}</h1>
      <p className="mt-1 text-body-sm text-text-secondary">
        Status: {pod.status}
        {pod.hostSemifinalIndex
          ? ` · Host in semifinal ${pod.hostSemifinalIndex}`
          : ""}
      </p>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Participants</h2>
        <ul className="mt-3 space-y-2 text-body-sm">
          {(detail?.members ?? []).map((member) => (
            <li key={member.memberId}>
              Position {member.positionNumber}: {member.publicCode ?? member.participantId.slice(0, 8)}{" "}
              ({member.gamerTag})
            </li>
          ))}
          {(detail?.members ?? []).length === 0 ? (
            <li className="text-text-muted">No participants assigned.</li>
          ) : null}
        </ul>
        {canManage ? (
          <QualificationAssignForm tournamentId={tournamentId} podNumber={podNumber} />
        ) : null}
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-h3">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-body-sm text-text-muted">
            No matches generated yet. Pod must be ready (4/4) then generate matches.
          </p>
        ) : (
          matches.map((match) => (
            <div
              key={match.id}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <p className="font-semibold uppercase text-body-sm">
                {match.qualificationRound}
                {match.semifinalIndex ? ` ${match.semifinalIndex}` : ""} · {match.status}
              </p>
              <p className="mt-2 text-body-sm">
                {match.slotALabel} vs {match.slotBLabel}
              </p>
              {match.result?.outcomeType === "auto_advance" ? (
                <p className="mt-2 text-body-sm text-accent">HOST POSITION → AUTO-ADVANCE</p>
              ) : null}
              {match.result && match.result.outcomeType === "played" ? (
                <p className="mt-2 text-body-sm">
                  Result: {match.result.participantAScore} - {match.result.participantBScore}
                </p>
              ) : null}
              {canRecord &&
              match.status !== "completed" &&
              match.slotBType !== "host" &&
              match.slotAType !== "host" &&
              match.participantAId &&
              match.participantBId ? (
                <div className="mt-3">
                  <QualificationMatchRecordForm
                    tournamentId={tournamentId}
                    podNumber={podNumber}
                    matchId={match.id}
                  />
                </div>
              ) : (
                <QualificationMatchRecordForm
                  tournamentId={tournamentId}
                  podNumber={podNumber}
                  matchId={match.id}
                  disabled
                />
              )}
            </div>
          ))
        )}
      </section>

      {pod.qualifierParticipantId ? (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Pod winner (qualifier)</h2>
          <p className="mt-2 font-mono text-body-sm">{pod.qualifierParticipantId}</p>
        </section>
      ) : null}
    </AdminShell>
  );
}
