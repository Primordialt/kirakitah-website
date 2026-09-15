"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EligibilityConfigActions({
  tournamentId,
  canManage,
  currentDeadlineDisplay,
}: {
  tournamentId: string;
  canManage: boolean;
  currentDeadlineDisplay: string | null;
}) {
  const router = useRouter();
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [reason, setReason] = useState("");
  const [clearDeadline, setClearDeadline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!canManage) {
    return (
      <p className="mt-3 text-body-sm text-text-muted">
        Only SUPER_ADMIN may configure the YouTube verification deadline.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-body-sm font-semibold">Configure YouTube verification deadline</p>
      <p className="text-body-sm text-text-muted">
        Times are interpreted in Africa/Lagos (WAT). Leave unset to avoid penalizing
        existing selected participants. Current deadline:{" "}
        {currentDeadlineDisplay ?? "Not configured"}.
      </p>
      <label className="flex items-center gap-2 text-body-sm">
        <input
          type="checkbox"
          checked={clearDeadline}
          onChange={(event) => setClearDeadline(event.target.checked)}
        />
        Clear deadline (unset)
      </label>
      {!clearDeadline ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="date"
            value={deadlineDate}
            onChange={(event) => setDeadlineDate(event.target.value)}
            className="rounded border border-border px-2 py-1 text-body-sm"
            aria-label="Deadline date"
          />
          <input
            type="time"
            value={deadlineTime}
            onChange={(event) => setDeadlineTime(event.target.value)}
            className="rounded border border-border px-2 py-1 text-body-sm"
            aria-label="Deadline time"
          />
        </div>
      ) : null}
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason for change (required)"
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
      />
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const response = await fetch(
            `/api/admin/tournaments/${tournamentId}/eligibility-config`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reason,
                clearDeadline,
                deadlineDate: clearDeadline ? null : deadlineDate,
                deadlineTime: clearDeadline ? null : deadlineTime,
              }),
            },
          );
          const payload = (await response.json()) as {
            success?: boolean;
            error?: { message: string };
          };
          setLoading(false);
          if (!response.ok || !payload.success) {
            setError(payload.error?.message ?? "Failed to update deadline.");
            return;
          }
          setReason("");
          setDeadlineDate("");
          setDeadlineTime("");
          setClearDeadline(false);
          router.refresh();
        }}
        className="rounded bg-brand-primary px-3 py-1 text-button text-white disabled:opacity-50"
      >
        Confirm &amp; save
      </button>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
