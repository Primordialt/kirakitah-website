"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QualificationPodActions({
  tournamentId,
  podNumber,
  status,
  canManage,
  canRecord,
}: {
  tournamentId: string;
  podNumber: number;
  status: string;
  canManage: boolean;
  canRecord: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const post = async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/qualification/pods/${podNumber}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Operation failed.");
      return;
    }
    router.refresh();
  };

  if (!canManage && !canRecord) return null;

  return (
    <div className="flex flex-wrap gap-2 text-body-sm">
      {canManage && status === "ready" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void post({ action: "generate_matches" })}
          className="text-accent underline disabled:opacity-50"
        >
          Generate matches
        </button>
      ) : null}
      {canManage && status === "completed" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void post({ action: "advance_top32" })}
          className="text-accent underline disabled:opacity-50"
        >
          Advance to Top 32
        </button>
      ) : null}
      <a
        href={`/admin/tournaments/${tournamentId}/qualification/pods/${podNumber}`}
        className="text-accent underline"
      >
        Open pod
      </a>
      {error ? (
        <p role="alert" className="w-full text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function QualificationAssignForm({
  tournamentId,
  podNumber,
}: {
  tournamentId: string;
  podNumber: number;
}) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [positionNumber, setPositionNumber] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/qualification/pods/${podNumber}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          participantId: participantId.trim(),
          positionNumber: Number(positionNumber),
        }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Assignment failed.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
      <p className="text-body-sm font-semibold">Assign participant</p>
      <input
        value={participantId}
        onChange={(e) => setParticipantId(e.target.value)}
        placeholder="Participant UUID"
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
      />
      <select
        value={positionNumber}
        onChange={(e) => setPositionNumber(e.target.value)}
        className="rounded border border-border px-2 py-1 text-body-sm"
      >
        <option value="1">Position 1</option>
        <option value="2">Position 2</option>
        <option value="3">Position 3</option>
        <option value="4">Position 4</option>
      </select>
      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="rounded bg-brand-primary px-3 py-1 text-button text-white disabled:opacity-50"
      >
        Assign
      </button>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function QualificationMatchRecordForm({
  tournamentId,
  podNumber,
  matchId,
  disabled,
}: {
  tournamentId: string;
  podNumber: number;
  matchId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/qualification/pods/${podNumber}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_result",
          matchId,
          participantAScore: Number(scoreA),
          participantBScore: Number(scoreB),
        }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Failed to record result.");
      return;
    }
    router.refresh();
  };

  if (disabled) {
    return <p className="text-body-sm text-text-muted">Resolved / not playable</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
        onClick={() => void submit()}
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
