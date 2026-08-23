import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import {
  KnockoutGenerateButton,
  KnockoutMatchResultForm,
  KnockoutPairingForm,
  MatchScheduleForm,
} from "@/components/admin/KnockoutActions";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import { listKnockoutBracket } from "@/server/tournament/knockout/bracket-service";
import { getChampionPublicProjection } from "@/server/tournament/knockout/completion-service";
import { getPairingAdminView } from "@/server/tournament/knockout/pairing-service";
import { getKnockoutDashboard } from "@/server/tournament/knockout/readiness-service";

export default async function AdminKnockoutPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Knockout unavailable</h1>
      </AdminShell>
    );
  }

  const dashboard = await getKnockoutDashboard(tournamentId);
  const pairings = await getPairingAdminView(tournamentId);
  const bracket = await listKnockoutBracket(tournamentId);
  const champion = await getChampionPublicProjection(tournamentId);

  const canManage = roleHasPermission(session.user.role, "tournament:knockout_manage");
  const canRecord = roleHasPermission(session.user.role, "tournament:result_record");
  const canSchedule = roleHasPermission(session.user.role, "tournament:match_schedule");
  const bracketGenerated = dashboard.bracketStatus !== "not_generated";

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
      <h1 className="mt-2 text-h2">Knockout — KIRAKITAH TOP 32</h1>
      <p className="mt-1 text-body text-text-secondary">
        Single elimination · R32 → R16 → QF → SF → Grand Final · rules kg926-v1
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Top 32</p>
          <p className="text-h3">
            {dashboard.actual.participants} / {dashboard.expected.participants}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Bracket</p>
          <p className="text-h3">{dashboard.bracketStatus}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Matches</p>
          <p className="text-body-sm mt-1">
            R32 {dashboard.actual.r32}/{dashboard.expected.r32} · R16{" "}
            {dashboard.actual.r16}/{dashboard.expected.r16} · QF {dashboard.actual.qf}/
            {dashboard.expected.qf} · SF {dashboard.actual.sf}/{dashboard.expected.sf} ·
            Final {dashboard.actual.final}/{dashboard.expected.final}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-body-sm text-text-muted">Champion</p>
          <p className="text-h3 font-mono text-lg">
            {champion?.championPublicCode ?? "—"}
          </p>
        </div>
      </section>

      {!dashboard.readiness.ready ? (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Knockout not ready</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-text-secondary">
            {dashboard.readiness.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Round of 32 pairing</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Manual pairing only — no automatic seeding. Confirm all 16 pairings before
          generating the bracket.
        </p>
        <div className="mt-4">
          <KnockoutPairingForm
            tournamentId={tournamentId}
            qualifiers={pairings.qualifiers}
            existingPairings={pairings.pairings}
            canManage={canManage}
            bracketGenerated={bracketGenerated}
          />
        </div>
        <div className="mt-4">
          <KnockoutGenerateButton
            tournamentId={tournamentId}
            canManage={canManage}
            hasPairings={Boolean(pairings.confirmedPairingSetId)}
            bracketGenerated={bracketGenerated}
          />
        </div>
      </section>

      {bracket.rounds.map((round) => (
        <section
          key={round.id}
          className={`mt-6 rounded-xl border p-4 ${
            round.roundType === "grand_final"
              ? "border-accent bg-surface-elevated"
              : "border-border bg-surface-elevated"
          }`}
        >
          <h2 className="text-h3">
            {round.roundType === "grand_final" ? "GRAND FINAL" : round.name}
          </h2>
          <p className="text-body-sm text-text-muted">Status: {round.status}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {round.matches.map((match) => (
              <div
                key={match.id}
                className={`rounded border p-3 ${
                  match.isGrandFinal ? "border-accent" : "border-border"
                }`}
              >
                <p className="text-body-sm font-semibold">
                  Match {match.slotIndex ?? "—"} · {match.status}
                </p>
                <p className="mt-2 text-body-sm">
                  {match.participantACode ??
                    (match.slotAType === "match_winner" ? "Winner TBD" : "—")}{" "}
                  vs{" "}
                  {match.participantBCode ??
                    (match.slotBType === "match_winner" ? "Winner TBD" : "—")}
                </p>
                <MatchScheduleForm
                  matchId={match.id}
                  canSchedule={canSchedule}
                  schedulingStatus={match.schedulingStatus}
                  scheduledAt={match.scheduledAt}
                  timezone={match.timezone}
                  participantsReady={Boolean(
                    match.participantAId && match.participantBId,
                  )}
                  matchResolved={
                    match.status === "completed" || match.status === "forfeited"
                  }
                />
                {match.scoreA != null && match.scoreB != null ? (
                  <p className="mt-1 text-body-sm">
                    Result: {match.scoreA} - {match.scoreB}
                  </p>
                ) : null}
                {canRecord &&
                match.status !== "completed" &&
                match.status !== "forfeited" &&
                match.participantAId &&
                match.participantBId ? (
                  <KnockoutMatchResultForm
                    tournamentId={tournamentId}
                    matchId={match.id}
                  />
                ) : (
                  <KnockoutMatchResultForm
                    tournamentId={tournamentId}
                    matchId={match.id}
                    disabled
                  />
                )}
              </div>
            ))}
          </div>
          {round.roundType === "grand_final" && champion?.championPublicCode ? (
            <p className="mt-4 text-h3">
              CHAMPION · {champion.championPublicCode}
            </p>
          ) : null}
        </section>
      ))}
    </AdminShell>
  );
}
