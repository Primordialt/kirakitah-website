"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRANSITIONS: Record<string, string[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function PhaseStatusActions({
  tournamentId,
  phaseId,
  currentStatus,
}: {
  tournamentId: string;
  phaseId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState(TRANSITIONS[currentStatus]?.[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const options = TRANSITIONS[currentStatus] ?? [];
  if (options.length === 0) {
    return (
      <p className="mt-3 text-body-sm text-text-muted">No further transitions.</p>
    );
  }

  const submit = async () => {
    if (!toStatus) return;
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/tournaments/${tournamentId}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseId, toStatus }),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to update phase.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="text-body-sm">
        Transition to
        <select
          value={toStatus}
          onChange={(event) => setToStatus(event.target.value)}
          className="mt-1 block h-10 rounded-lg border border-border bg-surface px-3"
        >
          {options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="h-10 rounded-lg bg-brand-primary px-4 text-button text-white disabled:opacity-50"
      >
        Update status
      </button>
      {error ? (
        <p role="alert" className="w-full text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
