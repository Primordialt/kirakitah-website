"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ProfileReopenActions({
  profileId,
  participantName,
}: {
  profileId: string;
  participantName: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reopen = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(
      `/api/admin/participant-profiles/${profileId}/reopen`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );

    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message?: string };
    };

    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to reopen profile.");
      return;
    }

    window.location.reload();
  };

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setOpen(true);
          setReason("");
          setError(null);
        }}
      >
        REOPEN PROFILE
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reopen-profile-title-${profileId}`}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id={`reopen-profile-title-${profileId}`}
              className="text-h4 text-text-primary"
            >
              Reopen this verified profile?
            </h3>
            <p className="mt-3 text-body-sm text-text-secondary">
              This will remove the verified status and return the profile for
              review. The participant will no longer be considered verified until
              the profile is approved again.
            </p>
            <p className="mt-2 text-body-sm text-text-secondary">
              Participant:{" "}
              <span className="font-medium text-text-primary">{participantName}</span>
            </p>
            <form className="mt-4 space-y-4" onSubmit={(event) => void reopen(event)}>
              <label
                className="block text-label text-text-primary"
                htmlFor={`reopen-reason-${profileId}`}
              >
                Reason for reopening
              </label>
              <textarea
                id={`reopen-reason-${profileId}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                required
                minLength={8}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                placeholder="Internal reason recorded in audit logs"
              />
              {error ? (
                <p role="alert" className="text-body-sm text-error">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" loading={loading} disabled={reason.trim().length < 8}>
                  Reopen Profile
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
