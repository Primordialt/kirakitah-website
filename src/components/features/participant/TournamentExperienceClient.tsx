"use client";

import { Button } from "@/components/ui";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { ParticipantNav } from "@/components/features/participant/ParticipantNav";
import Link from "next/link";
import { useEffect, useState } from "react";

type Experience = {
  tournament: { id: string; name: string; game: string; status: string };
  profileGate: { canApply: boolean; message: string | null; code: string | null };
  application: {
    referenceId: string;
    statusLabel: string;
    statusDescription: string;
    submittedAt: string;
    identityLabel: string;
    socialLabel: string;
    socialPlatforms: Array<{
      platformLabel: string;
      label: string;
    }>;
  } | null;
  eligibility: { label: string; description: string } | null;
  selection: {
    label: string;
    description: string;
    publicCode: string | null;
  } | null;
  qualification: {
    podNumber: number;
    podStatus: string;
    yourPosition: number | null;
    members: Array<{
      positionNumber: number;
      publicCode: string | null;
      gamerTag: string;
      isYou: boolean;
    }>;
  } | null;
  upcomingMatch: {
    roundLabel: string;
    opponentGamerTag: string | null;
    opponentPublicCode: string | null;
    scheduledDisplay: string;
    timezoneLabel: string;
    matchStatus: string;
  } | null;
};

export function TournamentExperienceClient({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<{
        experience?: Experience;
      }>(`/api/participant/tournaments/${tournamentId}`);

      if (cancelled) return;
      setLoading(false);

      if (!response.ok || !payload.experience) {
        setError(apiErrorMessage(payload, "Unable to load tournament."));
        return;
      }
      setExperience(payload.experience);
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading tournament…
      </p>
    );
  }

  if (error || !experience) {
    return (
      <div className="space-y-4">
        <ParticipantNav />
        <p role="alert" className="text-body-sm text-error">
          {error ?? "Unable to load tournament."}
        </p>
        <Button href="/dashboard">Back to dashboard</Button>
      </div>
    );
  }

  const { application, selection, qualification, upcomingMatch } = experience;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <ParticipantNav />

      <header>
        <h1 className="text-h2 text-text-primary">
          {experience.tournament.name.toUpperCase()}
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          {experience.tournament.game} · Tournament status:{" "}
          {experience.tournament.status.replace(/_/g, " ")}
        </p>
      </header>

      {!application ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-h4 text-text-primary">APPLICATION</h2>
          {experience.profileGate.canApply ? (
            <>
              <p className="mt-2 text-body-sm text-text-secondary">
                You have not applied for this tournament yet.
              </p>
              <Button
                href={`/tournaments/${TOURNAMENT_EVENT_ID}/apply`}
                className="mt-4"
              >
                APPLY FOR TOURNAMENT
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-body-sm text-text-secondary">
                {experience.profileGate.message ??
                  "Complete and verify your profile to apply."}
              </p>
              <Button href="/profile" className="mt-4">
                COMPLETE PROFILE
              </Button>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-h4 text-text-primary">APPLICATION STATUS</h2>
            <p className="mt-2 text-body font-semibold text-text-primary">
              {application.statusLabel}
            </p>
            <p className="mt-1 text-body-sm text-text-secondary">
              {application.statusDescription}
            </p>
            <p className="mt-3 text-body-sm text-text-muted">
              Reference: {application.referenceId}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-h4 text-text-primary">VERIFICATION</h2>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-body-sm font-medium text-text-primary">
                  Identity verification
                </dt>
                <dd className="text-body-sm text-text-secondary">
                  {application.identityLabel}
                </dd>
              </div>
              <div>
                <dt className="text-body-sm font-medium text-text-primary">
                  Social follows
                </dt>
                <dd className="text-body-sm text-text-secondary">
                  {application.socialLabel}
                </dd>
                <dd className="mt-2 text-body-sm text-text-muted">
                  Your social follows are being reviewed.
                </dd>
              </div>
              <div>
                <dt className="text-body-sm font-medium text-text-primary">
                  Required platforms
                </dt>
                <dd className="mt-2">
                  <ul className="space-y-1">
                    {application.socialPlatforms.map((platform) => (
                      <li
                        key={platform.platformLabel}
                        className="text-body-sm text-text-secondary"
                      >
                        {platform.platformLabel}: {platform.label}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </section>

          {experience.eligibility ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-h4 text-text-primary">ELIGIBILITY</h2>
              <p className="mt-2 text-body font-semibold text-text-primary">
                {experience.eligibility.label}
              </p>
              <p className="mt-1 text-body-sm text-text-secondary">
                {experience.eligibility.description}
              </p>
            </section>
          ) : null}

          {selection ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-h4 text-text-primary">PARTICIPATION</h2>
              <p className="mt-2 text-body font-semibold text-text-primary">
                {selection.label}
              </p>
              <p className="mt-1 text-body-sm text-text-secondary">
                {selection.description}
              </p>
              {selection.publicCode ? (
                <p className="mt-3 text-body-sm font-medium text-text-primary">
                  Public code: {selection.publicCode}
                </p>
              ) : null}
            </section>
          ) : null}

          {qualification ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-h4 text-text-primary">YOUR POD</h2>
              <p className="mt-2 text-body-sm text-text-secondary">
                Pod {qualification.podNumber}
                {qualification.yourPosition
                  ? ` · Position ${qualification.yourPosition}`
                  : ""}
              </p>
              <ul className="mt-4 space-y-2">
                {qualification.members.map((member) => (
                  <li
                    key={`${member.positionNumber}-${member.gamerTag}`}
                    className={`text-body-sm ${
                      member.isYou
                        ? "font-semibold text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {member.positionNumber}. {member.gamerTag}
                    {member.publicCode ? ` (${member.publicCode})` : ""}
                    {member.isYou ? " · You" : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {upcomingMatch ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-h4 text-text-primary">UPCOMING MATCH</h2>
              <p className="mt-2 text-body-sm text-text-secondary">
                {upcomingMatch.roundLabel}
              </p>
              <p className="mt-2 text-body-sm text-text-primary">
                Opponent:{" "}
                {upcomingMatch.opponentGamerTag ??
                  upcomingMatch.opponentPublicCode ??
                  "TBD"}
              </p>
              <p className="mt-2 text-body-sm text-text-secondary">
                {upcomingMatch.scheduledDisplay} ({upcomingMatch.timezoneLabel})
              </p>
              <p className="mt-1 text-body-sm text-text-muted">
                Status: {upcomingMatch.matchStatus}
              </p>
              <Link
                href="/matches"
                className="mt-4 inline-block text-body-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                View all matches
              </Link>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
