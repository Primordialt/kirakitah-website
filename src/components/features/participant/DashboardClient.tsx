"use client";

import { LogoutButton } from "@/components/features/participant/LogoutButton";
import { Button } from "@/components/ui";
import { COMPETITION_NAME, TOURNAMENT_EVENT_ID } from "@/config/competition";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import {
  getDashboardProfileCta,
  getProfileStatusLabel,
  type ParticipantProfileStatus,
} from "@/lib/participant/dashboard-status";
import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  account?: { username: string; email: string };
  profile?: {
    status: ParticipantProfileStatus;
    completionPercent: number;
    correctionReason: string | null;
  };
};

export function DashboardClient() {
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
      if (!response.ok || !payload.account || !payload.profile) {
        setError(apiErrorMessage(payload, "Unable to load your dashboard."));
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
        Loading dashboard…
      </p>
    );
  }

  if (error || !data?.account || !data.profile) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-body-sm text-error">
          {error ?? "Unable to load your dashboard."}
        </p>
        <Button href="/login">LOGIN</Button>
      </div>
    );
  }

  const { account, profile } = data;
  const cta = getDashboardProfileCta(profile.status);
  const statusLabel = getProfileStatusLabel(profile.status);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 text-text-primary">
            WELCOME, {account.username.toUpperCase()}
          </h1>
          <p className="mt-2 text-body text-text-secondary">
            PROFILE {profile.completionPercent}% COMPLETE · {statusLabel}
          </p>
        </div>
        <LogoutButton />
      </div>

      <section aria-labelledby="profile-status-heading" className="space-y-4">
        <h2 id="profile-status-heading" className="text-h4 text-text-primary">
          {cta.headline}
        </h2>
        {profile.status === "needs_correction" && profile.correctionReason ? (
          <p className="text-body-sm text-error" role="status">
            {profile.correctionReason}
          </p>
        ) : null}
        {profile.status === "submitted_for_review" ? (
          <p className="text-body-sm text-text-secondary">
            Your profile is being reviewed. You can view it while waiting.
          </p>
        ) : null}
        <Button href={cta.href}>{cta.buttonLabel}</Button>
      </section>

      <section
        aria-labelledby="tournament-heading"
        className="border-t border-border pt-8"
      >
        <h2 id="tournament-heading" className="text-h4 text-text-primary">
          {COMPETITION_NAME}
        </h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          The inaugural KIRAKITAH Gaming championship.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {profile.status === "verified" ? (
            <Button href={`/tournaments/${TOURNAMENT_EVENT_ID}/apply`}>
              APPLY FOR TOURNAMENT
            </Button>
          ) : (
            <Button href="/tournaments" variant="secondary">
              VIEW TOURNAMENTS
            </Button>
          )}
          <Link
            href="/profile"
            className="inline-flex h-10 items-center text-body-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            View profile
          </Link>
        </div>
      </section>
    </div>
  );
}
