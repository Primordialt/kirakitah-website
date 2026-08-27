"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IdentityReviewActions({
  referenceId,
  canReview,
}: {
  referenceId: string;
  canReview: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!canReview) {
    return (
      <p className="text-body-sm text-text-muted">
        Your role cannot submit identity reviews.
      </p>
    );
  }

  const submit = async (decision: "approved" | "rejected") => {
    setError(null);
    if (decision === "rejected") {
      const confirmed = window.confirm(
        "Are you sure you want to reject this identity review? Review notes are required.",
      );
      if (!confirmed) return;
      if (notes.trim().length < 8) {
        setError("Review notes are required when rejecting identity.");
        return;
      }
    }

    setLoading(true);
    const response = await fetch(
      `/api/admin/applications/${referenceId}/identity-review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to submit review.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <h3 className="text-h3">Identity review</h3>
      <p className="text-body-sm text-text-secondary">
        Manual comparison only. Approving identity does not approve the
        application.
      </p>
      <label className="block text-body-sm">
        Review notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void submit("approved")}
          className="h-10 rounded-lg bg-success/20 px-4 text-button text-success disabled:opacity-50"
        >
          Approve identity
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void submit("rejected")}
          className="h-10 rounded-lg bg-error/20 px-4 text-button text-error disabled:opacity-50"
        >
          Reject identity
        </button>
      </div>
    </div>
  );
}

export function ApplicationStatusActions({
  referenceId,
  currentStatus,
  canChange,
}: {
  referenceId: string;
  currentStatus: string;
  canChange: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!canChange) return null;

  const submit = async (nextStatus: string, confirmMessage: string) => {
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/applications/${referenceId}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to change status.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <h3 className="text-h3">Application review</h3>
      <p className="text-body-sm text-text-secondary">
        Current status:{" "}
        <span className="font-medium text-text-primary">{currentStatus}</span>
      </p>
      <p className="text-body-sm text-text-muted">
        Approving an application does not select the applicant. Selection is a
        separate operation.
      </p>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {currentStatus === "received" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void submit(
                "under_review",
                "Move this application to under review?",
              )
            }
            className="min-h-11 rounded-lg bg-brand-primary px-4 text-button text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Start review
          </button>
        ) : null}
        {currentStatus === "under_review" ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void submit(
                  "verified",
                  "Approve this application? This does not select the participant.",
                )
              }
              className="min-h-11 rounded-lg bg-success/20 px-4 text-button text-success disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Approve application
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void submit(
                  "rejected",
                  "Reject this application? This action cannot be undone.",
                )
              }
              className="min-h-11 rounded-lg bg-error/20 px-4 text-button text-error disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Reject application
            </button>
          </>
        ) : null}
        {currentStatus === "received" || currentStatus === "under_review" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void submit(
                "withdrawn",
                "Withdraw this application? This action cannot be undone.",
              )
            }
            className="min-h-11 rounded-lg border border-border px-4 text-button text-text-secondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Withdraw application
          </button>
        ) : null}
        {currentStatus === "verified" ||
        currentStatus === "rejected" ||
        currentStatus === "withdrawn" ? (
          <p className="text-body-sm text-text-muted">
            This application status is final.
          </p>
        ) : null}
      </div>
      <p className="text-body-sm text-text-muted">
        Profile corrections are handled in Profile reviews. Application status
        has no separate needs-correction state.
      </p>
    </div>
  );
}

export function RevealIdentityButton({ referenceId }: { referenceId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reveal = async () => {
    setError(null);
    const response = await fetch(
      `/api/admin/applications/${referenceId}/identity/reveal`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      identity?: { identificationNumber: string };
      error?: { message: string };
    };
    if (!response.ok || !payload.success || !payload.identity) {
      setError(payload.error?.message ?? "Unable to reveal identity.");
      return;
    }
    setValue(payload.identity.identificationNumber);
  };

  return (
    <div className="mt-2">
      {value ? (
        <p className="font-mono text-body-sm">{value}</p>
      ) : (
        <button
          type="button"
          onClick={() => void reveal()}
          className="text-body-sm text-accent underline"
        >
          Reveal identification number
        </button>
      )}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
