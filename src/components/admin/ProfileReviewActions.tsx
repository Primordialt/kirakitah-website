"use client";

import { Button } from "@/components/ui";
import { useState } from "react";

export function ProfileReviewActions({ profileId }: { profileId: string }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"approve" | "needs_correction" | null>(
    null,
  );

  const review = async (decision: "approve" | "needs_correction") => {
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
        ? "Profile approved."
        : "Profile returned for correction.",
    );
    window.location.reload();
  };

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-label text-text-primary" htmlFor={`reason-${profileId}`}>
        Correction reason
      </label>
      <textarea
        id={`reason-${profileId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body"
        placeholder="Public-safe reason if returning for correction"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          loading={loading === "approve"}
          onClick={() => void review("approve")}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={loading === "needs_correction"}
          onClick={() => void review("needs_correction")}
        >
          Needs correction
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
