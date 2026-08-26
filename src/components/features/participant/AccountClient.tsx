"use client";

import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { ParticipantNav } from "@/components/features/participant/ParticipantNav";
import {
  getProfileStatusLabel,
  type ParticipantProfileStatus,
} from "@/lib/participant/dashboard-status";
import { useEffect, useState } from "react";

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
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <ParticipantNav />
        <p role="alert" className="text-body-sm text-error">
          {error ?? "Unable to load account."}
        </p>
        <Button href="/login">LOGIN</Button>
      </div>
    );
  }

  const { account, profile } = data;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <ParticipantNav />

      <header>
        <h1 className="text-h2 text-text-primary">ACCOUNT</h1>
        <p className="mt-2 text-body text-text-secondary">
          Your KIRAKITAH participant account details.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5">
        <dl className="space-y-4">
          <div>
            <dt className="text-body-sm font-medium text-text-primary">
              Username
            </dt>
            <dd className="text-body-sm text-text-secondary">
              {account.username}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-primary">
              Email
            </dt>
            <dd className="text-body-sm text-text-secondary">
              {account.email}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-primary">
              Email verified
            </dt>
            <dd className="text-body-sm text-text-secondary">
              {account.emailVerifiedAt ? "Yes" : "No"}
            </dd>
          </div>
          {profile ? (
            <div>
              <dt className="text-body-sm font-medium text-text-primary">
                Profile status
              </dt>
              <dd className="text-body-sm text-text-secondary">
                {getProfileStatusLabel(profile.status)} (
                {profile.completionPercent}% complete)
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/forgot-password" variant="secondary">
            Reset password
          </Button>
          <Button href="/profile" variant="secondary">
            My profile
          </Button>
        </div>
      </section>
    </div>
  );
}
