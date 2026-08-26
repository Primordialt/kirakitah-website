import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import {
  QualificationAssignForm,
  QualificationHostForm,
  QualificationMatchRecordForm,
  QualificationReassignForm,
  QualificationRemoveButton,
} from "@/components/admin/QualificationActions";
import { MatchResultActions } from "@/components/admin/MatchResultActions";
import { MatchSchedulePanel } from "@/components/admin/MatchSchedulePanel";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  explainPodReadiness,
  getPodByNumber,
  getPodDetail,
} from "@/server/tournament/qualification/pod-service";
import { getPodMatchDetail } from "@/server/tournament/qualification/match-engine";
import { listMatchScheduleHistory } from "@/server/tournament/scheduling/notification-service";

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
  const members = detail?.members ?? [];
  const canManage = roleHasPermission(session.user.role, "tournament:pod_manage");
  const canRecord = roleHasPermission(session.user.role, "tournament:result_record");
  const canCorrect = roleHasPermission(session.user.role, "tournament:result_correct");
  const canForfeit = roleHasPermission(session.user.role, "tournament:forfeit");
  const canDispute = roleHasPermission(session.user.role, "tournament:match_manage");
  const canSchedule = roleHasPermission(session.user.role, "tournament:match_schedule");

  const readinessReason = explainPodReadiness({
    status: pod.status,
    capacity: pod.capacity,
    memberCount: members.length,
    hostSemifinalIndex: pod.hostSemifinalIndex,
    matchesGenerated: matches.length,
    qualifierPublicCode:
      members.find((m) => m.participantId === pod.qualifierParticipantId)?.publicCode ??
      null,
  });

  const positions = [1, 2, 3, 4].map((positionNumber) => {
    const member = members.find((row) => row.positionNumber === positionNumber);
    return { positionNumber, member };
  });

  const matchesWithHistory = await Promise.all(
    matches.map(async (match) => ({
      match,
      history: await listMatchScheduleHistory(match.id),
    })),
  );

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
        Status: {pod.status} · {members.length}/{pod.capacity} participants
        {pod.hostSemifinalIndex
          ? ` · HOST in Semifinal ${pod.hostSemifinalIndex}`
          : ""}
      </p>
      <p className="mt-2 text-body-sm text-text-muted">{readinessReason}</p>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Participants & positions</h2>
        <ul className="mt-3 space-y-3 text-body-sm">
          {positions.map(({ positionNumber, member }) => (
            <li
              key={positionNumber}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
            >
              <span>
                Position {positionNumber}:{" "}
                {member ? (
                  <>
                    <span className="font-mono text-xs">
                      {member.publicCode ?? "—"}
                    </span>{" "}
                    ({member.gamerTag}) · {member.participantStatus}
                  </>
                ) : (
                  <span className="text-text-muted">Empty</span>
                )}
              </span>
              {canManage && member && pod.status !== "completed" ? (
                <QualificationRemoveButton
                  tournamentId={tournamentId}
                  podNumber={podNumber}
                  participantId={member.participantId}
                  publicCode={member.publicCode}
                />
              ) : null}
            </li>
          ))}
        </ul>

        {pod.hostSemifinalIndex ? (
          <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-body-sm">
            <span className="font-semibold">HOST</span> occupies Semifinal{" "}
            {pod.hostSemifinalIndex}. Host is not a tournament participant and does
            not count toward the 4 participant positions.
          </p>
        ) : null}

        {canManage && pod.status !== "completed" ? (
          <>
            <QualificationAssignForm
              tournamentId={tournamentId}
              podNumber={podNumber}
            />
            <QualificationReassignForm
              tournamentId={tournamentId}
              podNumber={podNumber}
            />
            <QualificationHostForm
              tournamentId={tournamentId}
              podNumber={podNumber}
              currentHostSemifinalIndex={pod.hostSemifinalIndex}
            />
          </>
        ) : null}
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-h3">Matches</h2>
        <p className="text-body-sm text-text-muted">
          Normal pod: Semifinal 1 · Semifinal 2 · Final. Generation is idempotent.
        </p>
        {matches.length === 0 ? (
          <p className="text-body-sm text-text-muted">
            No matches generated yet.{" "}
            {pod.status === "ready"
              ? "Use Generate Matches from the qualification dashboard when ready."
              : readinessReason}
          </p>
        ) : (
          matchesWithHistory.map(({ match, history }) => {
            const isHostMatch =
              match.slotAType === "host" || match.slotBType === "host";
            const canEnterScore =
              canRecord &&
              match.status !== "completed" &&
              match.status !== "forfeited" &&
              match.status !== "cancelled" &&
              !isHostMatch &&
              match.participantAId &&
              match.participantBId;
            const matchResolved =
              match.status === "completed" ||
              match.status === "forfeited" ||
              match.status === "cancelled";

            return (
              <div
                key={match.id}
                className="rounded-xl border border-border bg-surface-elevated p-4"
              >
                <p className="font-semibold uppercase text-body-sm">
                  {match.qualificationRound}
                  {match.semifinalIndex ? ` ${match.semifinalIndex}` : ""} ·{" "}
                  {match.status}
                </p>
                <p className="mt-2 text-body-sm">
                  {match.slotALabel} vs {match.slotBLabel}
                </p>
                {match.result?.outcomeType === "auto_advance" ? (
                  <p className="mt-2 text-body-sm text-accent">
                    HOST POSITION → AUTO-ADVANCE (no fake score)
                  </p>
                ) : null}
                {match.result && match.result.outcomeType === "played" ? (
                  <p className="mt-2 text-body-sm">
                    Result: {match.result.participantAScore} -{" "}
                    {match.result.participantBScore}
                  </p>
                ) : null}
                {match.status === "requires_resolution" ? (
                  <p className="mt-2 text-body-sm text-text-secondary">
                    This match requires an approved tie-resolution method.
                    Detailed dispute/forfeit policy pending final tournament
                    rules.
                  </p>
                ) : null}

                <MatchSchedulePanel
                  matchId={match.id}
                  canSchedule={canSchedule}
                  schedulingStatus={match.schedulingStatus}
                  scheduledAt={match.scheduledAt}
                  timezone={match.timezone}
                  participantsReady={Boolean(
                    match.participantAId && match.participantBId && !isHostMatch,
                  )}
                  matchResolved={matchResolved}
                  history={history}
                />

                <div className="mt-3 space-y-3">
                  {canEnterScore ? (
                    <QualificationMatchRecordForm
                      tournamentId={tournamentId}
                      podNumber={podNumber}
                      matchId={match.id}
                      status={match.status}
                    />
                  ) : (
                    <QualificationMatchRecordForm
                      tournamentId={tournamentId}
                      podNumber={podNumber}
                      matchId={match.id}
                      disabled
                      status={match.status}
                    />
                  )}
                  {!isHostMatch ? (
                    <MatchResultActions
                      tournamentId={tournamentId}
                      matchId={match.id}
                      status={match.status}
                      participantAId={match.participantAId}
                      participantBId={match.participantBId}
                      canRecord={false}
                      canCorrect={canCorrect}
                      canForfeit={canForfeit}
                      canDispute={canDispute}
                    />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </section>

      {pod.qualifierParticipantId ? (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">QUALIFIER</h2>
          <p className="mt-2 font-mono text-body-sm">
            {members.find((m) => m.participantId === pod.qualifierParticipantId)
              ?.publicCode ?? "Public code pending"}
          </p>
          <p className="mt-1 text-body-sm text-text-muted">
            {members.find((m) => m.participantId === pod.qualifierParticipantId)
              ?.gamerTag ?? ""}
          </p>
        </section>
      ) : null}
    </AdminShell>
  );
}
