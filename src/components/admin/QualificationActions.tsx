"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

async function postPodAction(
  tournamentId: string,
  podNumber: number,
  body: Record<string, unknown>,
) {
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
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "Operation failed.");
  }
}

export function QualificationPodActions({
  tournamentId,
  podNumber,
  status,
  canManage,
  canAdvance,
}: {
  tournamentId: string;
  podNumber: number;
  status: string;
  canManage: boolean;
  canAdvance: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      await postPodAction(tournamentId, podNumber, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!canManage && !canAdvance) {
    return (
      <Link
        href={`/admin/tournaments/${tournamentId}/qualification/pods/${podNumber}`}
        className="text-accent underline"
      >
        Open pod
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 text-body-sm">
      {canManage && status === "ready" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void run({ action: "generate_matches" })}
          className="text-accent underline disabled:opacity-50"
        >
          Generate matches
        </button>
      ) : null}
      {canAdvance && status === "completed" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void run({ action: "advance_top32" })}
          className="text-accent underline disabled:opacity-50"
        >
          Advance to Top 32
        </button>
      ) : null}
      <Link
        href={`/admin/tournaments/${tournamentId}/qualification/pods/${podNumber}`}
        className="text-accent underline"
      >
        Open pod
      </Link>
      {error ? (
        <p role="alert" className="w-full text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function QualificationBulkAdvanceButton({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/qualification/advance-top32`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      advanced?: number;
      skipped?: number;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Advance failed.");
      return;
    }
    setMessage(
      `Advanced ${payload.advanced ?? 0}; already advanced ${payload.skipped ?? 0}.`,
    );
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="rounded-lg bg-brand-primary px-4 py-2 text-button text-white disabled:opacity-50"
      >
        Advance all completed pod winners to Top 32
      </button>
      {message ? <p className="text-body-sm text-text-secondary">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
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
    try {
      await postPodAction(tournamentId, podNumber, {
        action: "assign",
        participantId: participantId.trim(),
        positionNumber: Number(positionNumber),
      });
      setParticipantId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
      <p className="text-body-sm font-semibold">Assign participant</p>
      <p className="text-body-sm text-text-muted">
        Manual assignment only. Pairing is controlled by the tournament team.
      </p>
      <input
        value={participantId}
        onChange={(e) => setParticipantId(e.target.value)}
        placeholder="Participant UUID"
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
        aria-label="Participant UUID"
      />
      <select
        value={positionNumber}
        onChange={(e) => setPositionNumber(e.target.value)}
        className="rounded border border-border px-2 py-1 text-body-sm"
        aria-label="Pod position"
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

export function QualificationReassignForm({
  tournamentId,
  podNumber,
}: {
  tournamentId: string;
  podNumber: number;
}) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [positionNumber, setPositionNumber] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await postPodAction(tournamentId, podNumber, {
        action: "reassign",
        participantId: participantId.trim(),
        positionNumber: Number(positionNumber),
        reason: reason.trim(),
      });
      setParticipantId("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reassignment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
      <p className="text-body-sm font-semibold">Reassign participant</p>
      <input
        value={participantId}
        onChange={(e) => setParticipantId(e.target.value)}
        placeholder="Participant UUID"
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
        aria-label="Participant UUID to reassign"
      />
      <select
        value={positionNumber}
        onChange={(e) => setPositionNumber(e.target.value)}
        className="rounded border border-border px-2 py-1 text-body-sm"
        aria-label="New pod position"
      >
        <option value="1">Position 1</option>
        <option value="2">Position 2</option>
        <option value="3">Position 3</option>
        <option value="4">Position 4</option>
      </select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
        aria-label="Reassignment reason"
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="rounded border border-border-interactive px-3 py-1 text-button disabled:opacity-50"
      >
        Reassign
      </button>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function QualificationRemoveButton({
  tournamentId,
  podNumber,
  participantId,
  publicCode,
}: {
  tournamentId: string;
  podNumber: number;
  participantId: string;
  publicCode: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await postPodAction(tournamentId, podNumber, {
        action: "remove",
        participantId,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="text-body-sm text-accent underline disabled:opacity-50"
        aria-label={`Remove ${publicCode ?? "participant"} from pod`}
      >
        Remove
      </button>
      {error ? (
        <span role="alert" className="text-body-sm text-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}

export function QualificationHostForm({
  tournamentId,
  podNumber,
  currentHostSemifinalIndex,
}: {
  tournamentId: string;
  podNumber: number;
  currentHostSemifinalIndex: number | null;
}) {
  const router = useRouter();
  const [hostSemifinalIndex, setHostSemifinalIndex] = useState(
    currentHostSemifinalIndex == null ? "" : String(currentHostSemifinalIndex),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await postPodAction(tournamentId, podNumber, {
        action: "set_host",
        hostSemifinalIndex:
          hostSemifinalIndex === "" ? null : (Number(hostSemifinalIndex) as 1 | 2),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Host update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
      <p className="text-body-sm font-semibold">HOST configuration</p>
      <p className="text-body-sm text-text-muted">
        Host occupies a match slot and is not a tournament participant. The
        opponent auto-advances — no fake score is recorded.
      </p>
      <select
        value={hostSemifinalIndex}
        onChange={(e) => setHostSemifinalIndex(e.target.value)}
        className="rounded border border-border px-2 py-1 text-body-sm"
        aria-label="Host semifinal"
      >
        <option value="">No host</option>
        <option value="1">Host in Semifinal 1</option>
        <option value="2">Host in Semifinal 2</option>
      </select>
      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="rounded border border-border-interactive px-3 py-1 text-button disabled:opacity-50"
      >
        Save host setting
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
  status,
}: {
  tournamentId: string;
  podNumber: number;
  matchId: string;
  disabled?: boolean;
  status?: string;
}) {
  const router = useRouter();
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await postPodAction(tournamentId, podNumber, {
        action: "record_result",
        matchId,
        participantAScore: Number(scoreA),
        participantBScore: Number(scoreB),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record result.");
    }
  };

  if (disabled) {
    if (status === "requires_resolution" || status === "disputed") {
      return (
        <p className="text-body-sm text-text-muted">
          This match requires an approved tie-resolution method. Detailed
          dispute/forfeit policy pending final tournament rules.
        </p>
      );
    }
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
      <button type="button" onClick={() => void submit()} className="text-accent underline">
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
