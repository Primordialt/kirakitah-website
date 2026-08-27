"use client";

import { Button } from "@/components/ui";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import {
  getDashboardProfileCta,
  getProfileStatusLabel,
  type ParticipantProfileStatus,
} from "@/lib/participant/dashboard-status";
import { ParticipantNav } from "@/components/features/participant/ParticipantNav";
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

type TournamentSummary = {
  tournamentId: string;
  name: string;
  hasApplication: boolean;
  applicationStatusLabel: string | null;
  selected: boolean;
  publicCode: string | null;
  participantStatus: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export function DashboardClient() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [me, tournamentsRes, notificationsRes] = await Promise.all([
        participantFetch<MeResponse & { success?: boolean }>(
          "/api/participant/me",
        ),
        participantFetch<{ tournaments?: TournamentSummary[] }>(
          "/api/participant/tournaments",
        ),
        participantFetch<{ notifications?: NotificationItem[] }>(
          "/api/participant/notifications",
        ),
      ]);

      if (cancelled) return;
      setLoading(false);

      if (!me.response.ok || !me.payload.account || !me.payload.profile) {
        setError(apiErrorMessage(me.payload, "Unable to load your dashboard."));
        return;
      }

      setData(me.payload);
      setTournaments(tournamentsRes.payload.tournaments ?? []);
      setNotifications(
        (notificationsRes.payload.notifications ?? []).slice(0, 3),
      );
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
  const kg926 = tournaments.find((t) => t.tournamentId === TOURNAMENT_EVENT_ID);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <ParticipantNav />

      <header>
        <h1 className="text-h2 text-text-primary">
          WELCOME, {account.username.toUpperCase()}
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Your participant home for KIRAKITAH tournaments.
        </p>
      </header>

      <section
        aria-labelledby="profile-status-heading"
        className="rounded-xl border border-border bg-surface p-5"
      >
        <h2 id="profile-status-heading" className="text-h4 text-text-primary">
          PROFILE
        </h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          {profile.completionPercent}% complete · {statusLabel}
        </p>
        {profile.status === "verified" ? (
          <p className="mt-2 text-body-sm font-medium text-success">
            PROFILE VERIFIED ✓
          </p>
        ) : null}
        {profile.status === "needs_correction" && profile.correctionReason ? (
          <p className="mt-2 text-body-sm text-error" role="status">
            {profile.correctionReason}
          </p>
        ) : null}
        {profile.status === "submitted_for_review" ? (
          <p className="mt-2 text-body-sm text-text-secondary">
            Your profile is under review.
          </p>
        ) : null}
        <div className="mt-4">
          <Button href={cta.href}>{cta.buttonLabel}</Button>
        </div>
      </section>

      <section
        aria-labelledby="tournaments-heading"
        className="rounded-xl border border-border bg-surface p-5"
      >
        <h2 id="tournaments-heading" className="text-h4 text-text-primary">
          MY TOURNAMENTS
        </h2>
        {!kg926 ? (
          <p className="mt-3 text-body-sm text-text-secondary">
            You haven&apos;t applied for a tournament yet.
          </p>
        ) : (
          <article className="mt-4 space-y-3">
            <h3 className="text-body font-semibold text-text-primary">
              {kg926.name}
            </h3>
            {kg926.hasApplication ? (
              <>
                <p className="text-body-sm text-text-secondary">
                  {kg926.applicationStatusLabel ?? "Application on file"}
                </p>
                {kg926.selected && kg926.publicCode ? (
                  <p className="text-body-sm font-medium text-success">
                    {kg926.participantStatus} · {kg926.publicCode}
                  </p>
                ) : null}
                <Button
                  href={`/tournaments/${TOURNAMENT_EVENT_ID}`}
                  variant="secondary"
                >
                  VIEW APPLICATION
                </Button>
              </>
            ) : profile.status === "verified" ? (
              <>
                <p className="text-body-sm text-text-secondary">
                  Your profile is verified. You can apply when ready.
                </p>
                <Button href={`/tournaments/${TOURNAMENT_EVENT_ID}/apply`}>
                  APPLY FOR TOURNAMENT
                </Button>
              </>
            ) : (
              <>
                <p className="text-body-sm text-text-secondary">
                  Complete and verify your profile to apply.
                </p>
                <Button href="/profile">COMPLETE PROFILE</Button>
              </>
            )}
          </article>
        )}
      </section>

      <section
        aria-labelledby="notifications-heading"
        className="rounded-xl border border-border bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="notifications-heading" className="text-h4 text-text-primary">
            NOTIFICATIONS
          </h2>
          <Link
            href="/notifications"
            className="text-body-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            View all
          </Link>
        </div>
        {notifications.length === 0 ? (
          <p className="mt-3 text-body-sm text-text-secondary">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notifications.map((item) => (
              <li key={item.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <p className="text-body-sm font-medium text-text-primary">
                  {item.title}
                </p>
                <p className="text-body-sm text-text-secondary">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
