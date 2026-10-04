"use client";

import { Button } from "@/components/ui";
import { useCallback, useEffect, useId, useState } from "react";

type BulkQueue = "identity_pending" | "social_pending";

type BulkResult = {
  targeted: number;
  approved: number;
  skipped: number;
  failed: number;
  failures?: Array<{ referenceId: string; reason: string }>;
};

export function AdminBulkApproveControls({
  queue,
  eventId,
  label,
  canApprove,
}: {
  queue: BulkQueue;
  eventId: string;
  label: string;
  canApprove: boolean;
}) {
  const dialogTitleId = useId();
  const [open, setOpen] = useState(false);
  const [targeted, setTargeted] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const params = new URLSearchParams({ queue, eventId });
      const response = await fetch(
        `/api/admin/applications/bulk-approve?${params.toString()}`,
        { credentials: "include" },
      );
      const payload = (await response.json()) as {
        preview?: { targeted?: number };
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(payload.error?.message ?? "Unable to load preview.");
        setTargeted(null);
        return;
      }
      setTargeted(payload.preview?.targeted ?? 0);
    } finally {
      setLoadingPreview(false);
    }
  }, [queue, eventId]);

  useEffect(() => {
    if (open) {
      void loadPreview();
    } else {
      setResult(null);
      setError(null);
    }
  }, [open, loadPreview]);

  if (!canApprove) return null;

  const confirmApprove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/applications/bulk-approve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue, eventId, confirm: true }),
      });
      const payload = (await response.json()) as {
        result?: BulkResult;
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(payload.error?.message ?? "Bulk approval failed.");
        return;
      }
      setResult(payload.result ?? null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Approve all — {label}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={dialogTitleId} className="text-h4 text-text-primary">
              Approve all {label.toLowerCase()}?
            </h2>
            {loadingPreview ? (
              <p className="mt-3 text-body-sm text-text-muted" role="status">
                Counting eligible entries…
              </p>
            ) : result ? (
              <div className="mt-3 space-y-2 text-body-sm text-text-secondary">
                <p role="status">
                  Approved: {result.approved} · Skipped: {result.skipped} · Failed:{" "}
                  {result.failed}
                </p>
                {result.failures && result.failures.length > 0 ? (
                  <ul className="max-h-32 overflow-y-auto rounded-lg border border-border p-2 text-caption">
                    {result.failures.slice(0, 5).map((item) => (
                      <li key={`${item.referenceId}-${item.reason}`}>
                        {item.referenceId}: {item.reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-body-sm text-text-secondary">
                {targeted ?? 0} entr{targeted === 1 ? "y" : "ies"} will be approved using
                the same rules as individual approval. Rejected or already-reviewed records
                are skipped.
              </p>
            )}
            {error ? (
              <p className="mt-2 text-body-sm text-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                {result ? "Close" : "Cancel"}
              </Button>
              {!result ? (
                <Button
                  type="button"
                  onClick={() => void confirmApprove()}
                  loading={submitting}
                  disabled={loadingPreview || targeted === 0}
                >
                  Approve all
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
