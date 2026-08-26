import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { ScheduleStatusBadge } from "@/components/admin/MatchSchedulePanel";
import { isRegistrationBackendConfigured } from "@/server/env";
import { listTournamentScheduleBoard } from "@/server/tournament/scheduling/schedule-dashboard";
import {
  formatInTimezone,
  TOURNAMENT_DEFAULT_TIMEZONE,
} from "@/server/tournament/scheduling/timezone";

export default async function AdminTournamentSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("tournament:match_view");
  const { tournamentId } = await params;
  const query = await searchParams;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Schedule unavailable</h1>
      </AdminShell>
    );
  }

  const bucket =
    typeof query.bucket === "string"
      ? (query.bucket as
          | "today"
          | "upcoming"
          | "unscheduled"
          | "recently_rescheduled")
      : undefined;
  const phaseSlug = typeof query.phase === "string" ? query.phase : undefined;
  const podNumber =
    typeof query.pod === "string" && query.pod ? Number(query.pod) : undefined;
  const date = typeof query.date === "string" ? query.date : undefined;
  const schedulingStatus =
    typeof query.schedulingStatus === "string" ? query.schedulingStatus : undefined;
  const matchStatus =
    typeof query.matchStatus === "string" ? query.matchStatus : undefined;

  const rows = await listTournamentScheduleBoard({
    tournamentId,
    bucket,
    phaseSlug,
    podNumber: Number.isFinite(podNumber) ? podNumber : undefined,
    date,
    schedulingStatus,
    matchStatus,
  });

  const buckets = [
    { key: "today", label: "TODAY" },
    { key: "upcoming", label: "UPCOMING" },
    { key: "unscheduled", label: "UNSCHEDULED" },
    { key: "recently_rescheduled", label: "RECENTLY RESCHEDULED" },
  ] as const;

  return (
    <AdminShell session={session}>
      <p className="text-body-sm text-text-muted">
        <Link href={`/admin/tournaments/${tournamentId}`} className="text-accent underline">
          Tournament
        </Link>
      </p>
      <h1 className="mt-2 text-h2">Match schedule</h1>
      <p className="mt-2 text-body text-text-secondary">
        Operational scheduling for KIRAKITAH GAMING 926. Display timezone:{" "}
        {TOURNAMENT_DEFAULT_TIMEZONE} (WAT). Email/SMS delivery deferred.
      </p>

      <nav className="mt-4 flex flex-wrap gap-2 text-body-sm">
        <Link
          href={`/admin/tournaments/${tournamentId}/schedule`}
          className="rounded border border-border px-3 py-1"
        >
          All
        </Link>
        {buckets.map((item) => (
          <Link
            key={item.key}
            href={`/admin/tournaments/${tournamentId}/schedule?bucket=${item.key}`}
            className="rounded border border-border px-3 py-1"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input type="hidden" name="bucket" value={bucket ?? ""} />
        <input
          type="date"
          name="date"
          defaultValue={date ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by date"
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
        <select
          name="matchStatus"
          defaultValue={matchStatus ?? ""}
          className="rounded border border-border px-2 py-1 text-body-sm"
          aria-label="Filter by match status"
        >
          <option value="">Any match status</option>
          <option value="ready">Ready</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="rounded border border-border-interactive px-3 py-1 text-button"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-body-sm">
          <thead className="bg-surface-elevated text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium">Phase</th>
              <th className="px-3 py-2 font-medium">Pod/Round</th>
              <th className="px-3 py-2 font-medium">Participant A</th>
              <th className="px-3 py-2 font-medium">Participant B</th>
              <th className="px-3 py-2 font-medium">Scheduled</th>
              <th className="px-3 py-2 font-medium">Timezone</th>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-text-muted">
                  No matches match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.matchId} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.matchId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">{row.phase}</td>
                  <td className="px-3 py-2">
                    {row.podNumber != null ? `Pod ${row.podNumber}` : "—"} ·{" "}
                    {row.roundLabel}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">
                      {row.participantA.publicCode ?? "—"}
                    </span>{" "}
                    {row.participantA.gamerTag ?? ""}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">
                      {row.participantB.publicCode ?? "—"}
                    </span>{" "}
                    {row.participantB.gamerTag ?? ""}
                  </td>
                  <td className="px-3 py-2">
                    {formatInTimezone(row.scheduledAt, row.timezone)}
                  </td>
                  <td className="px-3 py-2">{row.timezone}</td>
                  <td className="px-3 py-2">
                    <ScheduleStatusBadge status={row.schedulingStatus} />
                  </td>
                  <td className="px-3 py-2">{row.resultState}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
