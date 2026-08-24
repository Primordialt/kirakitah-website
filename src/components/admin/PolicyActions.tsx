"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PolicyHistoryNote({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="mt-4 space-y-2">
      <p className="text-body-sm font-semibold">Append policy history snapshot</p>
      <p className="text-body-sm text-text-muted">
        Does not invent gameplay rules or create kg926-v2. Records the current
        finalized/pending boundary with a reason.
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes"
        className="w-full rounded border border-border px-2 py-1 text-body-sm"
      />
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const response = await fetch(`/api/admin/tournaments/${tournamentId}/rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, notes: notes || undefined }),
          });
          const payload = (await response.json()) as {
            success?: boolean;
            error?: { message: string };
          };
          setLoading(false);
          if (!response.ok || !payload.success) {
            setError(payload.error?.message ?? "Failed to record policy change.");
            return;
          }
          setReason("");
          setNotes("");
          router.refresh();
        }}
        className="rounded bg-brand-primary px-3 py-1 text-button text-white disabled:opacity-50"
      >
        Confirm &amp; record
      </button>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
