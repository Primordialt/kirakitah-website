import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getTournamentById } from "@/server/tournament/participant-service";
import {
  listKnockoutRounds,
  listTournamentPhases,
} from "@/server/tournament/competition/phase-service";
import { parseCompetitionRules } from "@/server/tournament/competition/competition-rules";
import {
  ensureQualificationPods,
  getQualificationDashboard,
} from "@/server/tournament/qualification/pod-service";
import { getKnockoutDashboard } from "@/server/tournament/knockout/readiness-service";
import { getChampionPublicProjection } from "@/server/tournament/knockout/completion-service";

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const session = await loadAdminSession("tournament:view");
  const { tournamentId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Tournament unavailable</h1>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  const phases = await listTournamentPhases(tournamentId);
  const rules = parseCompetitionRules(tournament.competitionRules);
  const knockout = phases.find((phase) => phase.slug === "knockout");
  const rounds = knockout ? await listKnockoutRounds(knockout.id) : [];
  await ensureQualificationPods(tournamentId);
  const qualificationDashboard = await getQualificationDashboard(tournamentId);
  const knockoutDashboard = await getKnockoutDashboard(tournamentId);
  const champion = await getChampionPublicProjection(tournamentId);

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href="/admin/tournaments" className="text-accent underline">
          Tournaments
        </Link>
      </p>
      <h1 className="mt-2 text-h2">{tournament.name}</h1>
      <p className="mt-1 text-body text-text-secondary">
        {tournament.game} · {tournament.format} · {tournament.status}
      </p>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Competition rules</h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          Version {rules.rulesVersion}. Qualification uses 32 single-elimination
          pods (128 → 32). Knockout uses manual R32 pairing; seeding methodology
          remains a Product Owner decision.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body-sm">
          <li>Qualification format: {rules.qualification.format}</li>
          <li>Pods: {rules.qualification.podCount} × {rules.qualification.positionsPerPod} positions</li>
          <li>Qualifiers: {rules.qualification.qualificationTarget}</li>
          <li>Assignment: {rules.qualification.assignmentMode}</li>
          <li>Tie resolution: {rules.qualification.tieResolution} (PENDING PRODUCT DECISION)</li>
          <li>Knockout format: {rules.knockout.format}</li>
          <li>Knockout pairing: {rules.knockout.pairing} (manual operational)</li>
          <li>Knockout seeding: {rules.knockout.seeding} (PENDING PRODUCT DECISION)</li>
          <li>Knockout scheduling: {rules.knockout.scheduling}</li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Qualification progress</h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          {qualificationDashboard.totalParticipants} / {qualificationDashboard.targetParticipants}{" "}
          participants · {qualificationDashboard.totalPods} / {qualificationDashboard.targetPods}{" "}
          pods · {qualificationDashboard.qualifiersProduced} / {qualificationDashboard.targetQualifiers}{" "}
          qualifiers
        </p>
        <ul className="mt-3 space-y-1 text-body-sm text-text-muted">
          <li>Pods filled: {qualificationDashboard.podsFilled}</li>
          <li>Pods active: {qualificationDashboard.podsActive}</li>
          <li>Pods completed: {qualificationDashboard.podsCompleted}</li>
          <li>Remaining qualifiers: {qualificationDashboard.remainingQualifiers}</li>
        </ul>
        <Link
          href={`/admin/tournaments/${tournamentId}/qualification`}
          className="mt-3 inline-block text-accent underline"
        >
          Manage qualification
        </Link>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Knockout progress</h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          {knockoutDashboard.actual.participants} / {knockoutDashboard.expected.participants}{" "}
          participants · bracket {knockoutDashboard.bracketStatus}
        </p>
        <ul className="mt-3 space-y-1 text-body-sm text-text-muted">
          <li>
            R32 {knockoutDashboard.actual.r32}/{knockoutDashboard.expected.r32} · R16{" "}
            {knockoutDashboard.actual.r16}/{knockoutDashboard.expected.r16} · QF{" "}
            {knockoutDashboard.actual.qf}/{knockoutDashboard.expected.qf} · SF{" "}
            {knockoutDashboard.actual.sf}/{knockoutDashboard.expected.sf} · Final{" "}
            {knockoutDashboard.actual.final}/{knockoutDashboard.expected.final}
          </li>
          <li>Champion: {champion?.championPublicCode ?? "—"}</li>
        </ul>
        <Link
          href={`/admin/tournaments/${tournamentId}/knockout`}
          className="mt-3 inline-block text-accent underline"
        >
          Manage knockout
        </Link>
        {" · "}
        <Link
          href={`/admin/tournaments/${tournamentId}/policy`}
          className="mt-3 inline-block text-accent underline"
        >
          Competition policy
        </Link>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-h3">Phases</h2>
        <ul className="mt-3 space-y-2 text-body-sm">
          {phases.map((phase) => (
            <li key={phase.id}>
              {phase.sequence}. {phase.name} ({phase.phaseType}) — {phase.status}
              {phase.participantLimit != null
                ? ` · limit ${phase.participantLimit}`
                : ""}
              {phase.qualificationTarget != null
                ? ` · qualify ${phase.qualificationTarget}`
                : ""}
            </li>
          ))}
        </ul>
        <Link
          href={`/admin/tournaments/${tournamentId}/phases`}
          className="mt-3 inline-block text-accent underline"
        >
          Manage phases
        </Link>
      </section>

      {rounds.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Knockout rounds</h2>
          <ul className="mt-3 space-y-1 text-body-sm">
            {rounds.map((round) => (
              <li key={round.id}>
                {round.name} — {round.participantCount} players — {round.status}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-body-sm text-text-muted">
            Manual R32 pairing required before bracket generation.
          </p>
        </section>
      ) : null}

      <nav className="mt-6 flex flex-wrap gap-3 text-body-sm">
        <Link
          href={`/admin/tournaments/${tournamentId}/qualification`}
          className="text-accent underline"
        >
          Qualification
        </Link>
        <Link
          href={`/admin/tournaments/${tournamentId}/knockout`}
          className="text-accent underline"
        >
          Knockout
        </Link>
        <Link
          href={`/admin/tournaments/${tournamentId}/matches`}
          className="text-accent underline"
        >
          Matches
        </Link>
        <Link href="/admin/tournaments/participants" className="text-accent underline">
          Participants
        </Link>
      </nav>
    </AdminShell>
  );
}
