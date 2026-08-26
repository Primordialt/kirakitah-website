"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_TZ = "Africa/Lagos";

/** Convert Africa/Lagos (or selected) wall time to ISO without using browser local TZ as tournament time. */
function toIsoFromWall(date: string, time: string, timezone: string): string {
  // Prefer explicit offset for Lagos; other zones fall back to Date parsing with appended Z-less form
  // Server also validates ISO. For Lagos (WAT=+01) we append +01:00.
  if (timezone === "Africa/Lagos") {
    return new Date(`${date}T${time}:00+01:00`).toISOString();
  }
  if (timezone === "UTC") {
    return new Date(`${date}T${time}:00Z`).toISOString();
  }
  // Best-effort: send as local-offset-naive ISO; server stores UTC from Date parse.
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatDisplay(iso: string | null, timezone: string | null) {
  if (!iso) return "Unscheduled";
  const tz = timezone ?? DEFAULT_TZ;
  try {
    return `${new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
    }).format(new Date(iso))} (${tz === "Africa/Lagos" ? "Africa/Lagos · WAT" : tz})`;
  } catch {
    return iso;
  }
}

export function ScheduleStatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded border border-border px-2 py-0.5 text-caption uppercase tracking-wide text-text-muted">
      {status}
    </span>
  );
}

export function MatchSchedulePanel({
  matchId,
  canSchedule,
  schedulingStatus,
  scheduledAt,
  timezone,
  participantsReady,
  matchResolved,
  history,
}: {
  matchId: string;
  canSchedule: boolean;
  schedulingStatus: string;
  scheduledAt: string | null;
  timezone: string | null;
  participantsReady: boolean;
  matchResolved: boolean;
  history?: Array<{
    action: string;
    scheduledAt: string | null;
    previousScheduledAt: string | null;
    timezone: string | null;
    reason: string | null;
    actorId: string;
    createdAt: string;
  }>;
}) {
  const router = useRouter();
  const [date, setDate] = useState(() => (scheduledAt ? scheduledAt.slice(0, 10) : ""));
  const [time, setTime] = useState("18:00");
  const [endTime, setEndTime] = useState("");
  const [tz, setTz] = useState(timezone ?? DEFAULT_TZ);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"idle" | "schedule" | "reschedule">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const post = async (action: "schedule" | "reschedule" | "cancel_schedule") => {
    setLoading(true);
    setError(null);
    if (!date || !time) {
      setLoading(false);
      setError("Date and time are required.");
      return;
    }
    const scheduledAtIso = toIsoFromWall(date, time, tz);
    const windowEnd = endTime ? toIsoFromWall(date, endTime, tz) : null;
    const response = await fetch(`/api/admin/matches/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        scheduledAt: scheduledAtIso,
        timezone: tz,
        scheduledWindowStart: scheduledAtIso,
        scheduledWindowEnd: windowEnd,
        reason: action === "schedule" ? undefined : reason,
      }),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Scheduling failed.");
      return;
    }
    setMode("idle");
    setReason("");
    router.refresh();
  };

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body-sm font-semibold">Schedule</p>
        <ScheduleStatusBadge status={schedulingStatus} />
      </div>
      <p className="text-body-sm text-text-secondary">
        {formatDisplay(scheduledAt, timezone)}
      </p>
      <p className="text-caption text-text-muted">
        Tournament timezone display: Africa/Lagos (WAT). Email/SMS delivery deferred.
      </p>

      {matchResolved ? (
        <p className="text-body-sm text-text-muted">
          Schedule locked — completed matches cannot be rescheduled. Policy pending
          final tournament rules for no-show / disconnect / forfeit.
        </p>
      ) : null}

      {canSchedule && !matchResolved && participantsReady ? (
        <div className="flex flex-wrap gap-2">
          {schedulingStatus !== "scheduled" ? (
            <button
              type="button"
              className="text-accent underline"
              onClick={() => setMode("schedule")}
            >
              Schedule
            </button>
          ) : (
            <button
              type="button"
              className="text-accent underline"
              onClick={() => setMode("reschedule")}
            >
              Reschedule
            </button>
          )}
        </div>
      ) : null}

      {!participantsReady ? (
        <p className="text-body-sm text-text-muted">
          Both participants must be resolved before scheduling.
        </p>
      ) : null}

      {mode === "schedule" && canSchedule ? (
        <ScheduleMatchDialog
          date={date}
          time={time}
          endTime={endTime}
          tz={tz}
          loading={loading}
          onDate={setDate}
          onTime={setTime}
          onEndTime={setEndTime}
          onTz={setTz}
          onCancel={() => setMode("idle")}
          onSave={() => void post("schedule")}
        />
      ) : null}

      {mode === "reschedule" && canSchedule ? (
        <RescheduleMatchDialog
          date={date}
          time={time}
          endTime={endTime}
          tz={tz}
          reason={reason}
          loading={loading}
          onDate={setDate}
          onTime={setTime}
          onEndTime={setEndTime}
          onTz={setTz}
          onReason={setReason}
          onCancel={() => setMode("idle")}
          onSave={() => void post("reschedule")}
        />
      ) : null}

      {history && history.length > 0 ? (
        <ScheduleHistory history={history} />
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type ScheduleFormFields = {
  date: string;
  time: string;
  endTime: string;
  tz: string;
  loading: boolean;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  onEndTime: (value: string) => void;
  onTz: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function ScheduleMatchDialog({
  date,
  time,
  endTime,
  tz,
  loading,
  onDate,
  onTime,
  onEndTime,
  onTz,
  onCancel,
  onSave,
}: ScheduleFormFields) {
  return (
    <div className="space-y-2 border-t border-border pt-2" role="dialog" aria-label="Schedule match">
      <p className="text-body-sm font-semibold">Schedule Match</p>
      <ScheduleDateTimeFields
        date={date}
        time={time}
        endTime={endTime}
        tz={tz}
        onDate={onDate}
        onTime={onTime}
        onEndTime={onEndTime}
        onTz={onTz}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onSave}
          className="rounded bg-brand-primary px-3 py-1 text-button text-white disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-body-sm text-text-muted underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function RescheduleMatchDialog({
  date,
  time,
  endTime,
  tz,
  reason,
  loading,
  onDate,
  onTime,
  onEndTime,
  onTz,
  onReason,
  onCancel,
  onSave,
}: ScheduleFormFields & {
  reason: string;
  onReason: (value: string) => void;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-2" role="dialog" aria-label="Reschedule match">
      <p className="text-body-sm font-semibold">Reschedule Match</p>
      <ScheduleDateTimeFields
        date={date}
        time={time}
        endTime={endTime}
        tz={tz}
        onDate={onDate}
        onTime={onTime}
        onEndTime={onEndTime}
        onTz={onTz}
      />
      <label className="block text-body-sm">
        Reason (required)
        <input
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          className="mt-1 w-full rounded border border-border px-2 py-1"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onSave}
          className="rounded bg-brand-primary px-3 py-1 text-button text-white disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-body-sm text-text-muted underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ScheduleDateTimeFields({
  date,
  time,
  endTime,
  tz,
  onDate,
  onTime,
  onEndTime,
  onTz,
}: {
  date: string;
  time: string;
  endTime: string;
  tz: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  onEndTime: (value: string) => void;
  onTz: (value: string) => void;
}) {
  return (
    <>
      <label className="block text-body-sm">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="mt-1 w-full rounded border border-border px-2 py-1"
        />
      </label>
      <label className="block text-body-sm">
        Time ({tz === "Africa/Lagos" ? "WAT" : tz})
        <input
          type="time"
          value={time}
          onChange={(e) => onTime(e.target.value)}
          className="mt-1 w-full rounded border border-border px-2 py-1"
        />
      </label>
      <label className="block text-body-sm">
        Optional window end
        <input
          type="time"
          value={endTime}
          onChange={(e) => onEndTime(e.target.value)}
          className="mt-1 w-full rounded border border-border px-2 py-1"
        />
      </label>
      <label className="block text-body-sm">
        Timezone
        <select
          value={tz}
          onChange={(e) => onTz(e.target.value)}
          className="mt-1 w-full rounded border border-border px-2 py-1"
        >
          <option value="Africa/Lagos">Africa/Lagos</option>
          <option value="UTC">UTC</option>
          <option value="Europe/London">Europe/London</option>
        </select>
      </label>
    </>
  );
}

export function ScheduleHistory({
  history,
}: {
  history: Array<{
    action: string;
    scheduledAt: string | null;
    previousScheduledAt: string | null;
    timezone: string | null;
    reason: string | null;
    actorId: string;
    createdAt: string;
  }>;
}) {
  return (
    <div className="mt-2 space-y-1">
      <p className="text-body-sm font-semibold">Schedule history</p>
      <ul className="space-y-1 text-caption text-text-muted">
        {history.map((entry, index) => (
          <li key={`${entry.createdAt}-${index}`}>
            {entry.action}: {formatDisplay(entry.scheduledAt, entry.timezone)}
            {entry.previousScheduledAt
              ? ` (was ${formatDisplay(entry.previousScheduledAt, entry.timezone)})`
              : ""}
            {entry.reason ? ` · ${entry.reason}` : ""} · {entry.createdAt}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UpcomingMatchCard({
  opponentLabel,
  scheduledDisplay,
  timezoneLabel,
  phase,
  roundLabel,
}: {
  opponentLabel: string;
  scheduledDisplay: string;
  timezoneLabel: string;
  phase: string;
  roundLabel: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface-elevated p-4">
      <p className="text-label tracking-wide text-accent">YOUR NEXT MATCH</p>
      <p className="mt-2 text-h4">vs {opponentLabel}</p>
      <p className="mt-2 text-body-sm text-text-secondary">{scheduledDisplay}</p>
      <p className="text-body-sm text-text-muted">{timezoneLabel}</p>
      <p className="mt-2 text-body-sm text-text-muted">
        {phase} · {roundLabel}
      </p>
    </article>
  );
}
