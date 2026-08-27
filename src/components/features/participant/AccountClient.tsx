"use client";

import { Button, Input } from "@/components/ui";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import {
  getProfileStatusLabel,
  type ParticipantProfileStatus,
} from "@/lib/participant/dashboard-status";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

type MeResponse = {
  account?: {
    username: string;
    email: string;
    emailVerifiedAt: string | null;
  };
  profile?: {
    status: ParticipantProfileStatus;
    completionPercent: number;
  };
};

export function AccountClient() {
  const router = useRouter();
  const dialogTitleId = useId();
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<MeResponse>(
        "/api/participant/me",
      );
      if (cancelled) return;
      setLoading(false);
      if (!response.ok || !payload.account) {
        setError(apiErrorMessage(payload, "Unable to load account."));
        return;
      }
      setData(payload);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!deleteOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteOpen]);

  const onDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    const { response, payload } = await participantFetch(
      "/api/participant/account/delete",
      {
        method: "POST",
        body: JSON.stringify({ confirmation }),
      },
    );
    setDeleting(false);
    if (!response.ok) {
      setDeleteError(
        apiErrorMessage(payload, "Unable to delete your account."),
      );
      return;
    }
    router.push("/login");
  };

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading account…
      </p>
    );
  }

  if (error || !data?.account) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-body-sm text-error">
          {error ?? "Unable to load account."}
        </p>
        <Button href="/login">LOGIN</Button>
      </div>
    );
  }

  const { account, profile } = data;
  const verified = profile?.status === "verified";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header>
        <h1 className="flex flex-wrap items-center gap-2 text-h2 text-text-primary">
          Account
          <VerifiedBadge verified={Boolean(verified)} />
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Sign-in details and account management for your KIRAKITAH participant
          account.
        </p>
      </header>

      <section aria-labelledby="account-details-heading" className="space-y-4">
        <h2 id="account-details-heading" className="text-h4 text-text-primary">
          Account
        </h2>
        <dl className="space-y-4 border-t border-border pt-4">
          <div>
            <dt className="text-body-sm font-medium text-text-primary">
              Username
            </dt>
            <dd className="flex items-center gap-2 text-body-sm text-text-secondary">
              {account.username}
              <VerifiedBadge verified={Boolean(verified)} />
            </dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-primary">Email</dt>
            <dd className="text-body-sm text-text-secondary">{account.email}</dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-primary">
              Account status
            </dt>
            <dd className="text-body-sm text-text-secondary">Active</dd>
          </div>
          {profile ? (
            <div>
              <dt className="text-body-sm font-medium text-text-primary">
                Profile verification
              </dt>
              <dd className="text-body-sm text-text-secondary">
                {getProfileStatusLabel(profile.status)} (
                {profile.completionPercent}% complete)
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section aria-labelledby="security-heading" className="space-y-4">
        <h2 id="security-heading" className="text-h4 text-text-primary">
          Security
        </h2>
        <p className="text-body-sm text-text-secondary">
          Passwords are never shown. Use password recovery to set a new
          password.
        </p>
        <Button href="/forgot-password" variant="secondary">
          Reset password
        </Button>
      </section>

      <section aria-labelledby="danger-heading" className="space-y-4">
        <h2 id="danger-heading" className="text-h4 text-text-primary">
          Account management
        </h2>
        <p className="text-body-sm text-text-secondary">
          Deleting your account signs you out and removes access. Tournament
          records needed for competition integrity are retained without your
          personal account details.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setDeleteOpen(true);
            setConfirmation("");
            setDeleteError(null);
          }}
        >
          Delete account
        </Button>
      </section>

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => setDeleteOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={dialogTitleId} className="text-h4 text-text-primary">
              Delete your account?
            </h2>
            <p className="mt-3 text-body-sm text-text-secondary">
              Deleting your account will sign you out and remove your access to
              KIRAKITAH. Type DELETE to confirm.
            </p>
            <form className="mt-5 space-y-4" onSubmit={(e) => void onDelete(e)}>
              <Input
                label="Confirmation"
                name="confirmation"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
              {deleteError ? (
                <p role="alert" className="text-body-sm text-error">
                  {deleteError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  loading={deleting}
                  disabled={confirmation.trim().toUpperCase() !== "DELETE"}
                >
                  Delete account
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteOpen(false)}
                >
                  Keep my account
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
