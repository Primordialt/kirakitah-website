"use client";

import { Button } from "@/components/ui";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ProfileStatusCard } from "@/components/features/participant/ProfileStatusCard";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import type { ParticipantProfileStatus } from "@/lib/participant/dashboard-status";
import { getTournamentApplyPresentation } from "@/lib/participant/profile-presentation";
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
        (notificationsRes.payload.notifications ?? []).slice(0, 2),
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
  const verified = profile.status === "verified";
  const kg926 = tournaments.find((t) => t.tournamentId === TOURNAMENT_EVENT_ID);
  const applyPresentation = getTournamentApplyPresentation(
    profile.status,
    profile.completionPercent,
    Boolean(kg926?.hasApplication),
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
          Your participant account
        </p>
        <h1 className="flex flex-wrap items-center gap-2 text-h2 text-text-primary">
          <span>Welcome, {account.username}</span>
          <VerifiedBadge verified={verified} size="md" />
        </h1>
      </header>

      <ProfileStatusCard
        status={profile.status}
        completionPercent={profile.completionPercent}
        correctionReason={profile.correctionReason}
      />

      <section
        aria-labelledby="tournaments-heading"
        className="border-t border-border pt-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="tournaments-heading" className="text-h4 text-text-primary">
            My tournaments
          </h2>
          <Link
            href="/tournaments"
            className="text-body-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            View all
          </Link>
        </div>
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
                  Application: {kg926.applicationStatusLabel ?? "On file"}
                </p>
                <Button
                  href={`/tournaments/${TOURNAMENT_EVENT_ID}`}
                  variant="secondary"
                >
                  View tournament
                </Button>
              </>
            ) : (
              <>
                <p className="text-body-sm text-text-secondary">
                  {applyPresentation.description}
                </p>
                <Button href={applyPresentation.href}>
                  {applyPresentation.buttonLabel}
                </Button>
              </>
            )}
          </article>
        )}
      </section>

      <section
        aria-labelledby="notifications-heading"
        className="border-t border-border pt-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="notifications-heading" className="text-h4 text-text-primary">
            Recent activity
          </h2>
          <Link
            href="/notifications"
            className="text-body-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
