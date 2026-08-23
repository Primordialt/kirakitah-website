"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Qualifier = {
  participantId: string;
  publicCode: string | null;
  status: string;
  seed: number | null;
};

type Pairing = {
  slotIndex: number;
  participantAId: string;
  participantBId: string;
};

export function KnockoutPairingForm({
  tournamentId,
  qualifiers,
  existingPairings,
  canManage,
  bracketGenerated,
}: {
  tournamentId: string;
  qualifiers: Qualifier[];
  existingPairings: Array<{
    slotIndex: number;
    participantAId: string;
    participantBId: string;
    participantACode: string | null;
    participantBCode: string | null;
  }>;
  canManage: boolean;
  bracketGenerated: boolean;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<
    Array<{ a: string; b: string }>
  >(() =>
    Array.from({ length: 16 }, (_, i) => {
      const existing = existingPairings.find((p) => p.slotIndex === i + 1);
      return {
        a: existing?.participantAId ?? "",
        b: existing?.participantBId ?? "",
      };
    }),
  );
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const used = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slots) {
      if (slot.a) set.add(slot.a);
      if (slot.b) set.add(slot.b);
    }
    return set;
  }, [slots]);

  const optionsFor = (current: string) =>
    qualifiers.filter((q) => q.participantId === current || !used.has(q.participantId));

  const submit = async (revise: boolean) => {
    setLoading(true);
    setError(null);
    const pairings: Pairing[] = slots.map((slot, index) => ({
      slotIndex: index + 1,
      participantAId: slot.a,
      participantBId: slot.b,
    }));

    const response = await fetch(`/api/admin/tournaments/${tournamentId}/knockout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: revise ? "revise_pairings" : "set_pairings",
        pairings,
        reason: revise ? "Admin revised Round of 32 pairings before bracket generation." : undefined,
      }),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Pairing failed.");
      return;
    }
    setConfirming(false);
    router.refresh();
  };

  if (!canManage) {
    return (
      <p className="text-body-sm text-text-muted">
        View only — pairing requires tournament:knockout_manage.
      </p>
    );
  }

  if (bracketGenerated) {
    return (
      <div className="space-y-2 text-body-sm">
        <p>Pairings locked after bracket generation.</p>
        {existingPairings.map((p) => (
          <p key={p.slotIndex}>
            Match {p.slotIndex}: {p.participantACode ?? "—"} vs {p.participantBCode ?? "—"}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((slot, index) => (
          <div key={index} className="rounded border border-border p-3">
            <p className="mb-2 text-body-sm font-semibold">R32 Match {index + 1}</p>
            <select
              aria-label={`Match ${index + 1} player A`}
              value={slot.a}
              onChange={(e) => {
                const next = [...slots];
                next[index] = { ...next[index], a: e.target.value };
                setSlots(next);
              }}
              className="mb-2 w-full rounded border border-border px-2 py-1 text-body-sm"
            >
              <option value="">Select participant A</option>
              {optionsFor(slot.a).map((q) => (
                <option key={q.participantId} value={q.participantId}>
                  {q.publicCode ?? q.participantId.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              aria-label={`Match ${index + 1} player B`}
              value={slot.b}
              onChange={(e) => {
                const next = [...slots];
                next[index] = { ...next[index], b: e.target.value };
                setSlots(next);
              }}
              className="w-full rounded border border-border px-2 py-1 text-body-sm"
            >
              <option value="">Select participant B</option>
              {optionsFor(slot.b).map((q) => (
                <option key={q.participantId} value={q.participantId}>
                  {q.publicCode ?? q.participantId.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded bg-brand-primary px-4 py-2 text-button text-white"
        >
          Review Round of 32 Pairings
        </button>
      ) : (
        <div className="rounded border border-border bg-surface-elevated p-4">
          <p className="font-semibold">Confirm Round of 32 Pairings</p>
          <p className="mt-1 text-body-sm text-text-secondary">
            This locks the 16 pairings for bracket generation. Changes after confirmation
            require an explicit revision with a reason.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit(existingPairings.length > 0)}
              className="rounded bg-brand-primary px-4 py-2 text-button text-white disabled:opacity-50"
            >
              Confirm pairings
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-accent underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function KnockoutGenerateButton({
  tournamentId,
  canManage,
  hasPairings,
  bracketGenerated,
}: {
  tournamentId: string;
  canManage: boolean;
  hasPairings: boolean;
  bracketGenerated: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!canManage || bracketGenerated) return null;

  return (
    <div>
      <button
        type="button"
        disabled={loading || !hasPairings}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const response = await fetch(`/api/admin/tournaments/${tournamentId}/knockout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "generate_bracket" }),
          });
          const payload = (await response.json()) as {
            success?: boolean;
            error?: { message: string };
          };
          setLoading(false);
          if (!response.ok || !payload.success) {
            setError(payload.error?.message ?? "Bracket generation failed.");
            return;
          }
          router.refresh();
        }}
        className="rounded bg-brand-primary px-4 py-2 text-button text-white disabled:opacity-50"
      >
        Generate knockout bracket
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function KnockoutMatchResultForm({
  tournamentId,
  matchId,
  disabled,
}: {
  tournamentId: string;
  matchId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return <p className="text-body-sm text-text-muted">Not playable yet</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        aria-label="Score A"
        value={scoreA}
        onChange={(e) => setScoreA(e.target.value)}
        className="w-14 rounded border border-border px-2 py-1"
      />
      <span>vs</span>
      <input
        aria-label="Score B"
        value={scoreB}
        onChange={(e) => setScoreB(e.target.value)}
        className="w-14 rounded border border-border px-2 py-1"
      />
      <button
        type="button"
        onClick={async () => {
          setError(null);
          const response = await fetch(`/api/admin/tournaments/${tournamentId}/knockout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "record_result",
              matchId,
              participantAScore: Number(scoreA),
              participantBScore: Number(scoreB),
            }),
          });
          const payload = (await response.json()) as {
            success?: boolean;
            error?: { message: string };
          };
          if (!response.ok || !payload.success) {
            setError(payload.error?.message ?? "Failed to record result.");
            return;
          }
          router.refresh();
        }}
        className="text-accent underline"
      >
        Record
      </button>
      {error ? (
        <p role="alert" className="w-full text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function MatchScheduleForm({
  matchId,
  canSchedule,
  schedulingStatus,
  scheduledAt,
  timezone,
  participantsReady,
  matchResolved,
}: {
  matchId: string;
  canSchedule: boolean;
  schedulingStatus: string;
  scheduledAt: string | null;
  timezone: string | null;
  participantsReady: boolean;
  matchResolved: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(() =>
    scheduledAt ? scheduledAt.slice(0, 10) : "",
  );
  const [time, setTime] = useState(() =>
    scheduledAt ? scheduledAt.slice(11, 16) : "18:00",
  );
  const [tz, setTz] = useState(timezone ?? "Africa/Lagos");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!canSchedule) {
    return (
      <p className="mt-2 text-body-sm text-text-muted">
        Schedule:{" "}
        {scheduledAt
          ? `${new Date(scheduledAt).toLocaleString()} (${timezone ?? "—"})`
          : schedulingStatus}
      </p>
    );
  }

  if (matchResolved) {
    return (
      <p className="mt-2 text-body-sm text-text-muted">
        Schedule locked — match resolved
        {scheduledAt ? ` · was ${new Date(scheduledAt).toLocaleString()}` : ""}
      </p>
    );
  }

  const post = async (action: "schedule" | "reschedule" | "cancel_schedule") => {
    setLoading(true);
    setError(null);
    const scheduledAtIso =
      date && time ? new Date(`${date}T${time}:00`).toISOString() : "";
    const response = await fetch(`/api/admin/matches/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        scheduledAt: scheduledAtIso,
        timezone: tz,
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
    router.refresh();
  };

  return (
    <div className="mt-3 space-y-2 rounded border border-border p-2">
      <p className="text-body-sm font-semibold">
        Schedule · {schedulingStatus}
        {scheduledAt
          ? ` · ${new Date(scheduledAt).toLocaleString()} (${timezone ?? "—"})`
          : ""}
      </p>
      {!participantsReady ? (
        <p className="text-body-sm text-text-muted">
          Participants must be resolved before scheduling.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Match date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-border px-2 py-1 text-body-sm"
            />
            <input
              aria-label="Match time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded border border-border px-2 py-1 text-body-sm"
            />
            <select
              aria-label="Timezone"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="rounded border border-border px-2 py-1 text-body-sm"
            >
              <option value="Africa/Lagos">Africa/Lagos</option>
              <option value="Africa/Accra">Africa/Accra</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          {schedulingStatus === "scheduled" ? (
            <input
              aria-label="Reschedule or cancel reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (reschedule / cancel)"
              className="w-full rounded border border-border px-2 py-1 text-body-sm"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {schedulingStatus !== "scheduled" ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void post("schedule")}
                className="text-accent underline disabled:opacity-50"
              >
                Schedule Match
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void post("reschedule")}
                  className="text-accent underline disabled:opacity-50"
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void post("cancel_schedule")}
                  className="text-error underline disabled:opacity-50"
                >
                  Cancel Schedule
                </button>
              </>
            )}
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
