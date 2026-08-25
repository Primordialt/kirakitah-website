"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialPlatform } from "@/config/social";

export interface SocialFollowRow {
  platform: SocialPlatform;
  applicantHandle: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export function SocialFollowReviewActions({
  referenceId,
  socialFollowStatus,
  attestation,
  platforms,
  canReview,
}: {
  referenceId: string;
  socialFollowStatus: string;
  attestation: boolean;
  platforms: SocialFollowRow[];
  canReview: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);

  const submit = async (
    platform: SocialPlatform,
    decision: "approved" | "rejected",
  ) => {
    setError(null);
    const platformNotes = (notes[platform] ?? "").trim();
    if (decision === "rejected" && platformNotes.length < 8) {
      setError("Review notes are required when rejecting a social platform.");
      return;
    }

    setLoadingPlatform(platform);
    const response = await fetch(
      `/api/admin/applications/${referenceId}/social-review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          decision,
          notes: platformNotes,
        }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoadingPlatform(null);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to submit social review.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h3 className="text-h3">Social following</h3>
      <p className="text-body-sm text-text-secondary">
        Manual follow verification only. Approving social follows does not
        approve identity or select a participant.
      </p>
      <dl className="space-y-1 text-body-sm">
        <div>
          <dt className="text-text-muted">Overall status</dt>
          <dd className="font-medium uppercase">{socialFollowStatus}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Applicant attestation</dt>
          <dd>{attestation ? "Recorded" : "Not recorded"}</dd>
        </div>
      </dl>

      {platforms.length === 0 ? (
        <p className="text-body-sm text-text-muted">
          No platform follow records yet. Existing applications remain pending
          review until handles are collected and verified.
        </p>
      ) : (
        <ul className="space-y-4">
          {platforms.map((row) => (
            <li
              key={row.platform}
              className="rounded-lg border border-border bg-surface-elevated p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium capitalize">{row.platform}</p>
                  <p className="text-body-sm text-text-secondary">
                    Handle: {row.applicantHandle}
                  </p>
                  <p className="text-body-sm text-text-muted">
                    Status: {row.verificationStatus}
                    {row.reviewedAt
                      ? ` · ${new Date(row.reviewedAt).toLocaleString()}`
                      : ""}
                    {row.reviewedBy ? ` · reviewer ${row.reviewedBy}` : ""}
                  </p>
                  {row.verificationNotes ? (
                    <p className="mt-1 text-body-sm text-text-muted">
                      Notes: {row.verificationNotes}
                    </p>
                  ) : null}
                </div>
              </div>

              {canReview && row.verificationStatus === "pending" ? (
                <div className="mt-3 space-y-2">
                  <label className="block text-body-sm">
                    Review notes
                    <textarea
                      value={notes[row.platform] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [row.platform]: event.target.value,
                        }))
                      }
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loadingPlatform === row.platform}
                      onClick={() => void submit(row.platform, "approved")}
                      className="h-10 rounded-lg bg-success/20 px-4 text-button text-success disabled:opacity-50"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={loadingPlatform === row.platform}
                      onClick={() => void submit(row.platform, "rejected")}
                      className="h-10 rounded-lg bg-error/20 px-4 text-button text-error disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!canReview ? (
        <p className="text-body-sm text-text-muted">
          Your role cannot submit social follow reviews.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
