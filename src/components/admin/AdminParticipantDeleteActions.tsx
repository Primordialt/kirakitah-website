"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminParticipantDeleteActions({
  accountId,
  username,
}: {
  accountId: string;
  username: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/admin/participants/${accountId}/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to delete participant.");
      return;
    }
    router.refresh();
    setOpen(false);
  };

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        className="h-10 rounded-lg border border-error px-4 text-button text-error"
        onClick={() => {
          setOpen(true);
          setConfirmation("");
          setError(null);
        }}
      >
        Delete participant account
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={titleId} className="text-h4">
              Delete participant account?
            </h3>
            <p className="mt-3 text-body-sm text-text-secondary">
              Account <span className="font-medium text-text-primary">@{username}</span>{" "}
              will be deactivated and personal data anonymized. Tournament
              records remain for integrity. Type DELETE to confirm.
            </p>
            <form className="mt-4 space-y-3" onSubmit={(e) => void onDelete(e)}>
              <label className="block text-label" htmlFor="participant-delete-confirm">
                Confirmation
              </label>
              <input
                id="participant-delete-confirm"
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                required
              />
              {error ? (
                <p role="alert" className="text-body-sm text-error">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading || confirmation.trim().toUpperCase() !== "DELETE"}
                  className="h-10 rounded-lg bg-error px-4 text-button text-white disabled:opacity-50"
                >
                  Delete account
                </button>
                <button
                  type="button"
                  className="h-10 rounded-lg border border-border px-4 text-button"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
