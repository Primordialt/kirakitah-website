"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminMatchProjection } from "@/server/tournament/competition/admin-match-projection";

type EditableParticipant = {
  participantId: string;
  publicCode: string | null;
  gamerTag: string | null;
  username: string | null;
  verified: boolean;
  podNumber: number | null;
  positionNumber: number | null;
};

const DEFAULT_TZ = "Africa/Lagos";

function initialDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function initialTime(iso: string | null, timezone: string): string {
  if (!iso) return "18:00";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));
    const hour = parts.find((p) => p.type === "hour")?.value ?? "18";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hour.padStart(2, "0")}:${minute}`;
  } catch {
    return "18:00";
  }
}

function participantOptionLabel(p: EditableParticipant): string {
  const parts = [
    p.publicCode,
    p.gamerTag ? `GamerTag: ${p.gamerTag}` : null,
    p.username ? `@${p.username}` : null,
    p.podNumber != null ? `Pod ${p.podNumber}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function SlotEditor({
  label,
  slot,
  editable,
  roster,
  mode,
  participantId,
  onModeChange,
  onParticipantChange,
}: {
  label: string;
  slot: AdminMatchProjection["slotA"];
  editable: boolean;
  roster: EditableParticipant[];
  mode: "keep" | "dependency" | "participant";
  participantId: string;
  onModeChange: (mode: "keep" | "dependency" | "participant") => void;
  onParticipantChange: (participantId: string) => void;
}) {
  if (!editable) {
    return (
      <fieldset className="space-y-1">
        <legend className="text-body-sm font-semibold">{label}</legend>
        <p className="text-body-sm text-text-muted">{slot.label}</p>
      </fieldset>
    );
  }

  if (slot.kind === "host") {
    return (
      <fieldset className="space-y-1">
        <legend className="text-body-sm font-semibold">{label}</legend>
        <p className="text-body-sm text-text-muted">HOST (not editable)</p>
      </fieldset>
    );
  }

  if (slot.kind === "match_winner") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-body-sm font-semibold">{label}</legend>
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="radio"
            name={label}
            checked={mode === "dependency"}
            onChange={() => onModeChange("dependency")}
          />
          Keep: {slot.label}
        </label>
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="radio"
            name={label}
            checked={mode === "participant"}
            onChange={() => onModeChange("participant")}
          />
          Replace with participant
        </label>
        {mode === "participant" ? (
          <select
            aria-label={`${label} participant`}
            value={participantId}
            onChange={(e) => onParticipantChange(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-body-sm"
          >
            <option value="">Select participant</option>
            {roster.map((p) => (
              <option key={p.participantId} value={p.participantId}>
                {participantOptionLabel(p)}
              </option>
            ))}
          </select>
        ) : null}
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-body-sm font-semibold">{label}</legend>
      <select
        aria-label={`${label} participant`}
        value={participantId}
        onChange={(e) => {
          onModeChange("participant");
          onParticipantChange(e.target.value);
        }}
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
      >
        <option value="">Select participant</option>
        {roster.map((p) => (
          <option key={p.participantId} value={p.participantId}>
            {participantOptionLabel(p)}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

export function EditMatchModal({
  tournamentId,
  match,
  roster,
  open,
  onClose,
}: {
  tournamentId: string;
  match: AdminMatchProjection;
  roster: EditableParticipant[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [slotAMode, setSlotAMode] = useState<"keep" | "dependency" | "participant">(
    match.slotA.kind === "match_winner" ? "dependency" : "keep",
  );
  const [slotBMode, setSlotBMode] = useState<"keep" | "dependency" | "participant">(
    match.slotB.kind === "match_winner" ? "dependency" : "keep",
  );
  const [participantAId, setParticipantAId] = useState(
    match.slotA.participantId ?? "",
  );
  const [participantBId, setParticipantBId] = useState(
    match.slotB.participantId ?? "",
  );
  const [date, setDate] = useState(() => initialDate(match.scheduledAt));
  const [time, setTime] = useState(() =>
    initialTime(match.scheduledAt, match.timezone),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const slotAEditable =
    match.editableParticipants && match.slotA.kind !== "host";
  const slotBEditable =
    match.editableParticipants && match.slotB.kind !== "host";

  const buildPayload = () => ({
    action: "edit" as const,
    slotA: slotAEditable
      ? slotAMode === "participant"
        ? { mode: "participant" as const, participantId: participantAId }
        : { mode: slotAMode }
      : { mode: "keep" as const },
    slotB: slotBEditable
      ? slotBMode === "participant"
        ? { mode: "participant" as const, participantId: participantBId }
        : { mode: slotBMode }
      : { mode: "keep" as const },
    date: match.editableSchedule ? date : undefined,
    time: match.editableSchedule ? time : undefined,
    timezone: DEFAULT_TZ,
  });

  const save = async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/matches/${match.matchId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    setConfirmOpen(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Failed to save match changes.");
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg sm:p-6"
      >
        <h2 id={titleId} className="text-h4">
          Edit match {match.matchShortId}
        </h2>
        <p className="mt-1 text-body-sm text-text-muted">
          {match.phaseName} · {match.roundLabel}
          {match.podNumber != null ? ` · Pod ${match.podNumber}` : ""}
        </p>

        <div className="mt-4 space-y-4">
          <SlotEditor
            label="Player A"
            slot={match.slotA}
            editable={slotAEditable}
            roster={roster}
            mode={slotAMode}
            participantId={participantAId}
            onModeChange={setSlotAMode}
            onParticipantChange={setParticipantAId}
          />
          <SlotEditor
            label="Player B"
            slot={match.slotB}
            editable={slotBEditable}
            roster={roster}
            mode={slotBMode}
            participantId={participantBId}
            onModeChange={setSlotBMode}
            onParticipantChange={setParticipantBId}
          />

          {match.editableSchedule ? (
            <fieldset className="space-y-2">
              <legend className="text-body-sm font-semibold">Schedule</legend>
              <label className="block text-body-sm">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded border border-border px-2 py-1"
                />
              </label>
              <label className="block text-body-sm">
                Time (WAT)
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full rounded border border-border px-2 py-1"
                />
              </label>
              <p className="text-caption text-text-muted">
                Timezone: Africa/Lagos (WAT)
              </p>
            </fieldset>
          ) : (
            <p className="text-body-sm text-text-muted">
              Schedule cannot be edited for this match status.
            </p>
          )}
        </div>

        {confirmOpen ? (
          <div className="mt-4 rounded-lg border border-warning/40 bg-surface-elevated p-3">
            <p className="text-body-sm">
              Changing opponents or schedule may affect participants and tournament
              operations. Continue?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void save()}
                className="rounded bg-brand-primary px-3 py-1 text-button text-white disabled:opacity-50"
              >
                Confirm save
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="text-body-sm text-text-muted underline"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || !match.editable}
              onClick={() => setConfirmOpen(true)}
              className="rounded bg-brand-primary px-4 py-2 text-button text-white disabled:opacity-50"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-4 py-2 text-button"
            >
              Cancel
            </button>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-body-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
