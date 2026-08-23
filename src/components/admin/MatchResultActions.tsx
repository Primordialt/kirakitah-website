"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MatchResultActions({
  tournamentId,
  matchId,
  status,
  participantAId,
  participantBId,
  canRecord,
  canCorrect,
  canForfeit,
  canDispute,
}: {
  tournamentId: string;
  matchId: string;
  status: string;
  participantAId: string;
  participantBId: string;
  canRecord: boolean;
  canCorrect: boolean;
  canForfeit: boolean;
  canDispute: boolean;
}) {
  const router = useRouter();
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const post = async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/matches/${matchId}`,
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

  return (
    <div className="space-y-2">
      {(canRecord || canCorrect) && status !== "cancelled" ? (
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Score A"
            value={scoreA}
            onChange={(event) => setScoreA(event.target.value)}
            className="w-16 rounded border border-border px-2 py-1"
          />
          <input
            aria-label="Score B"
            value={scoreB}
            onChange={(event) => setScoreB(event.target.value)}
            className="w-16 rounded border border-border px-2 py-1"
          />
          {canRecord && status !== "completed" && status !== "forfeited" ? (
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void post({
                  action: "record",
                  participantAScore: Number(scoreA),
                  participantBScore: Number(scoreB),
                })
              }
              className="text-accent underline disabled:opacity-50"
            >
              Record
            </button>
          ) : null}
          {canCorrect && (status === "completed" || status === "forfeited") ? (
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void post({
                  action: "correct",
                  participantAScore: Number(scoreA),
                  participantBScore: Number(scoreB),
                  reason,
                })
              }
              className="text-accent underline disabled:opacity-50"
            >
              Correct
            </button>
          ) : null}
        </div>
      ) : null}

      {(canCorrect || canForfeit) && (
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (correction/forfeit)"
          className="w-full rounded border border-border px-2 py-1"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {canDispute && status !== "disputed" && status !== "cancelled" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void post({ action: "dispute" })}
            className="text-warning underline disabled:opacity-50"
          >
            Dispute
          </button>
        ) : null}
        {canForfeit && status !== "forfeited" && status !== "cancelled" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void post({
                action: "forfeit",
                forfeitingParticipantId: participantAId,
                reason,
              })
            }
            className="text-error underline disabled:opacity-50"
          >
            Forfeit A
          </button>
        ) : null}
        {canForfeit && status !== "forfeited" && status !== "cancelled" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void post({
                action: "forfeit",
                forfeitingParticipantId: participantBId,
                reason,
              })
            }
            className="text-error underline disabled:opacity-50"
          >
            Forfeit B
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
