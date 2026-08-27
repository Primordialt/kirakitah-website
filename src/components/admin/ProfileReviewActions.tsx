"use client";

import { Button } from "@/components/ui";
import { useState } from "react";

export function ProfileReviewActions({
  profileId,
  completionPercent,
}: {
  profileId: string;
  completionPercent: number;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"approve" | "needs_correction" | null>(
    null,
  );

  const incomplete = completionPercent < 100;

  const review = async (decision: "approve" | "needs_correction") => {
    if (decision === "approve" && incomplete) {
      setError("Cannot verify an incomplete profile.");
      return;
    }

    setLoading(decision);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/admin/participant-profiles/${profileId}/review`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: decision === "needs_correction" ? reason : undefined,
        }),
      },
    );

    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message?: string };
    };

    setLoading(null);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to update review.");
      return;
    }

    setMessage(
      decision === "approve"
        ? "Profile verified."
        : "Correction requested from participant.",
    );
    window.location.reload();
  };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-body-sm text-text-secondary">
        Required review information: confirm completion is 100%, identity and
        contact details look consistent, then verify or request a public-safe
        correction.
      </p>
      {incomplete ? (
        <p className="text-body-sm text-error" role="status">
          This profile is marked incomplete ({completionPercent}%). Verification
          is blocked until completion is 100%.
        </p>
      ) : null}
      <label
        className="block text-label text-text-primary"
        htmlFor={`reason-${profileId}`}
      >
        Correction reason (participant-visible)
      </label>
      <textarea
        id={`reason-${profileId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        placeholder="Public-safe reason if requesting correction"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          loading={loading === "approve"}
          disabled={incomplete}
          onClick={() => void review("approve")}
        >
          VERIFY PROFILE
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={loading === "needs_correction"}
          onClick={() => void review("needs_correction")}
        >
          REQUEST CORRECTION
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-body-sm text-text-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
