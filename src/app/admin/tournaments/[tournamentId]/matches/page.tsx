import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMatchBoard } from "@/components/admin/AdminMatchBoard";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import {
  listAdminMatchProjections,
  listMatchEditableParticipants,
} from "@/server/tournament/competition/admin-match-projection";
import { getTournamentById } from "@/server/tournament/participant-service";
import { TOURNAMENT_DEFAULT_TIMEZONE } from "@/server/tournament/scheduling/timezone";

export default async function AdminTournamentMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("tournament:match_view");
  const { tournamentId } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const status = typeof query.status === "string" ? query.status : undefined;
  const schedulingStatus =
    typeof query.schedulingStatus === "string" ? query.schedulingStatus : undefined;
  const phaseSlug = typeof query.phase === "string" ? query.phase : undefined;
  const podNumber =
    typeof query.pod === "string" && query.pod ? Number(query.pod) : undefined;
  const date = typeof query.date === "string" ? query.date : undefined;
  const participantQuery =
    typeof query.participant === "string" ? query.participant : undefined;
  const matchIdQuery = typeof query.matchId === "string" ? query.matchId : undefined;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Matches unavailable</h1>
      </AdminShell>
    );
  }

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  const [{ items: matches }, roster] = await Promise.all([
    listAdminMatchProjections({
      tournamentId,
      page,
      pageSize: 50,
      status,
      schedulingStatus,
      phaseSlug,
      podNumber: Number.isFinite(podNumber) ? podNumber : undefined,
      date,
      participantQuery,
      matchIdQuery,
    }),
    listMatchEditableParticipants(tournamentId),
  ]);

  const canRecord = roleHasPermission(session.user.role, "tournament:result_record");
  const canCorrect = roleHasPermission(session.user.role, "tournament:result_correct");
  const canForfeit = roleHasPermission(session.user.role, "tournament:forfeit");
  const canManage = roleHasPermission(session.user.role, "tournament:match_manage");
  const canEdit = roleHasPermission(session.user.role, "tournament:match_edit");

  const buildFilterHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (schedulingStatus) params.set("schedulingStatus", schedulingStatus);
    if (phaseSlug) params.set("phase", phaseSlug);
    if (podNumber) params.set("pod", String(podNumber));
    if (date) params.set("date", date);
    if (participantQuery) params.set("participant", participantQuery);
    if (matchIdQuery) params.set("matchId", matchIdQuery);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    return `/admin/tournaments/${tournamentId}/matches${qs ? `?${qs}` : ""}`;
  };

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          {tournament.name}
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Matches</h1>
      <p className="mt-1 text-body text-text-secondary">
        Tournament match operations console. Display timezone:{" "}
        {TOURNAMENT_DEFAULT_TIMEZONE} (WAT).
      </p>
      <p className="mt-1 text-body-sm text-text-muted">
        <Link
          href={`/admin/tournaments/${tournamentId}/schedule`}
          className="text-accent underline"
        >
          Open schedule board
        </Link>
      </p>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input
          type="search"
          name="matchId"
          placeholder="Match ID prefix"
          defaultValue={matchIdQuery ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by match ID"
        />
        <input
          type="search"
          name="participant"
          placeholder="Participant / gamerTag"
          defaultValue={participantQuery ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by participant"
        />
        <input
          type="date"
          name="date"
          defaultValue={date ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by scheduled date"
        />
        <select
          name="phase"
          defaultValue={phaseSlug ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by phase"
        >
          <option value="">All phases</option>
          <option value="qualification">Qualification</option>
          <option value="knockout">Knockout</option>
        </select>
        <input
          type="number"
          name="pod"
          min={1}
          max={32}
          placeholder="Pod #"
          defaultValue={podNumber ?? ""}
          className="w-24 rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by pod"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by match status"
        >
          <option value="">Any match status</option>
          <option value="scheduled">Scheduled</option>
          <option value="ready">Ready</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="disputed">Disputed</option>
          <option value="forfeited">Forfeited</option>
          <option value="cancelled">Cancelled</option>
          <option value="requires_resolution">Requires resolution</option>
        </select>
        <select
          name="schedulingStatus"
          defaultValue={schedulingStatus ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by scheduling status"
        >
          <option value="">Any schedule status</option>
          <option value="unscheduled">Unscheduled</option>
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="rounded border border-border-interactive px-3 py-1 text-button"
        >
          Filter
        </button>
        <Link
          href={buildFilterHref({})}
          className="rounded border border-border px-3 py-1 text-button"
        >
          Clear
        </Link>
      </form>

      <AdminMatchBoard
        tournamentId={tournamentId}
        matches={matches}
        roster={roster}
        canEdit={canEdit}
        canRecord={canRecord}
        canCorrect={canCorrect}
        canForfeit={canForfeit}
        canDispute={canManage}
      />
    </AdminShell>
  );
}
