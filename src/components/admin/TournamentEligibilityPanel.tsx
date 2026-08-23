"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";

interface EligibilityReason {
  code: string;
  label: string;
}

interface EligibilityPayload {
  state: "ELIGIBLE" | "NOT_ELIGIBLE";
  reasons: EligibilityReason[];
  rulesVersion: string;
}

export function TournamentEligibilityPanel({
  referenceId,
  canEvaluate,
  canSelect,
  initialParticipantId,
  initialParticipantStatus,
}: {
  referenceId: string;
  canEvaluate: boolean;
  canSelect: boolean;
  initialParticipantId?: string | null;
  initialParticipantStatus?: string | null;
}) {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<EligibilityPayload | null>(null);
  const [participantId, setParticipantId] = useState(initialParticipantId ?? null);
  const [participantStatus, setParticipantStatus] = useState(
    initialParticipantStatus ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");

  const tournamentId = TOURNAMENT_EVENT_ID;

  const evaluate = async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/eligibility/${referenceId}`,
    );
    const payload = (await response.json()) as {
      success?: boolean;
      eligibility?: EligibilityPayload;
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success || !payload.eligibility) {
      setError(payload.error?.message ?? "Unable to evaluate eligibility.");
      return;
    }

    setEligibility(payload.eligibility);
  };

  const select = async () => {
    const confirmed = window.confirm(
      "Select this applicant as a tournament participant? Eligibility will be re-checked.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/participants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      participant?: { participantId: string; status: string };
      eligibility?: {
        eligible?: boolean;
        state?: "ELIGIBLE" | "NOT_ELIGIBLE";
        reasons: EligibilityReason[];
        rulesVersion: string;
      };
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success || !payload.participant) {
      setError(payload.error?.message ?? "Unable to select participant.");
      return;
    }

    setParticipantId(payload.participant.participantId);
    setParticipantStatus(payload.participant.status);
    if (payload.eligibility) {
      const state =
        payload.eligibility.state ??
        (payload.eligibility.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE");
      setEligibility({
        state,
        reasons: payload.eligibility.reasons,
        rulesVersion: payload.eligibility.rulesVersion,
      });
    }
    router.refresh();
  };

  const withdraw = async () => {
    if (!participantId) return;
    const confirmed = window.confirm("Withdraw this participant?");
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/participants/${participantId}/withdraw`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to withdraw participant.");
      return;
    }

    setParticipantStatus("withdrawn");
    router.refresh();
  };

  const disqualify = async () => {
    if (!participantId) return;
    if (disqualifyReason.trim().length < 8) {
      setError("Disqualification reason is required (minimum 8 characters).");
      return;
    }
    const confirmed = window.confirm("Disqualify this participant?");
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/tournaments/${tournamentId}/participants/${participantId}/disqualify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disqualifyReason }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to disqualify participant.");
      return;
    }

    setParticipantStatus("disqualified");
    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h3 className="text-h3">Tournament eligibility</h3>
      <p className="text-body-sm text-text-secondary">
        KIRAKITAH GAMING 926 participation is separate from application approval.
        Eligibility evaluates requirements; selection is an explicit admin action.
      </p>

      {participantStatus ? (
        <p className="text-body-sm">
          Participant status:{" "}
          <span className="font-semibold">{participantStatus}</span>
        </p>
      ) : null}

      {eligibility ? (
        <div className="rounded-lg border border-border bg-surface-elevated p-3">
          <p className="text-body-sm font-semibold">{eligibility.state}</p>
          <p className="mt-1 text-body-sm text-text-muted">
            Rules version: {eligibility.rulesVersion}
          </p>
          {eligibility.reasons.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm">
              {eligibility.reasons.map((reason) => (
                <li key={reason.code}>{reason.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm text-text-secondary">
              All current tournament requirements satisfied.
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {canEvaluate ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void evaluate()}
            className="h-10 rounded-lg border border-border px-4 text-button disabled:opacity-50"
          >
            Evaluate eligibility
          </button>
        ) : null}
        {canSelect && participantStatus !== "selected" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void select()}
            className="h-10 rounded-lg bg-brand-primary px-4 text-button text-white disabled:opacity-50"
          >
            Select participant
          </button>
        ) : null}
        {canSelect && participantStatus === "selected" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void withdraw()}
            className="h-10 rounded-lg bg-warning/20 px-4 text-button text-warning disabled:opacity-50"
          >
            Withdraw
          </button>
        ) : null}
      </div>

      {canSelect && participantStatus === "selected" ? (
        <div className="space-y-2">
          <label className="block text-body-sm">
            Disqualification reason
            <textarea
              value={disqualifyReason}
              onChange={(event) => setDisqualifyReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void disqualify()}
            className="h-10 rounded-lg bg-error/20 px-4 text-button text-error disabled:opacity-50"
          >
            Disqualify
          </button>
        </div>
      ) : null}

      {!canEvaluate && !canSelect ? (
        <p className="text-body-sm text-text-muted">
          Your role cannot evaluate eligibility or manage participants.
        </p>
      ) : null}
    </div>
  );
}
