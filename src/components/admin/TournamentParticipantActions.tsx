"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TournamentParticipantActions({
  tournamentId,
  participantId,
  status,
  canWithdraw,
  canDisqualify,
}: {
  tournamentId: string;
  participantId: string;
  status: string;
  canWithdraw: boolean;
  canDisqualify: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status !== "selected") {
    return <span className="text-text-muted">—</span>;
  }

  const withdraw = async () => {
    if (!window.confirm("Withdraw this participant?")) return;
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/participants/${participantId}/withdraw`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message: string } };
      setError(payload.error?.message ?? "Withdraw failed.");
      return;
    }
    router.refresh();
  };

  const disqualify = async () => {
    if (reason.trim().length < 8) {
      setError("Reason required (min 8 characters).");
      return;
    }
    if (!window.confirm("Disqualify this participant?")) return;
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/participants/${participantId}/disqualify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message: string } };
      setError(payload.error?.message ?? "Disqualify failed.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-2">
      {canWithdraw ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void withdraw()}
          className="text-accent underline disabled:opacity-50"
        >
          Withdraw
        </button>
      ) : null}
      {canDisqualify ? (
        <div className="space-y-1">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Disqualify reason"
            className="w-full rounded border border-border px-2 py-1"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void disqualify()}
            className="text-error underline disabled:opacity-50"
          >
            Disqualify
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
