"use client";

import { Button } from "@/components/ui";
import { getApplyGateAction } from "@/lib/participant/profile-presentation";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
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

function JourneyStage({
  title,
  label,
  description,
  children,
}: {
  title: string;
  label: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6 first:border-0 first:pt-0">
      <h2 className="text-h4 text-text-primary">{title}</h2>
      <p className="mt-2 text-body font-semibold text-text-primary">{label}</p>
      <p className="mt-1 text-body-sm text-text-secondary">{description}</p>
      {children}
    </section>
  );
}

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
        <p role="alert" className="text-body-sm text-error">
          {error ?? "Unable to load tournament."}
        </p>
        <Button href="/dashboard">Back to dashboard</Button>
      </div>
    );
  }

  const { application, selection, qualification, upcomingMatch } = experience;

  const applicationLabel = application?.statusLabel ?? "NOT STARTED";
  const applicationDescription = application
    ? application.statusDescription
    : experience.profileGate.canApply
      ? "You have not applied for this tournament yet."
      : (experience.profileGate.message ??
        "Complete and verify your profile to apply.");

  const eligibilityLabel = application
    ? (experience.eligibility?.label ?? "PENDING REVIEW")
    : "NOT STARTED";
  const eligibilityDescription = application
    ? (experience.eligibility?.description ??
      "Your application is being checked against tournament requirements. Pending review does not mean rejection.")
    : "Eligibility review begins after you submit an application.";

  const selectionLabel = selection?.label ?? "NOT YET SELECTED";
  const selectionDescription = selection?.description
    ?? (application
      ? "Eligible applicants may be selected to participate. Selection is separate from application and eligibility."
      : "Selection happens only after application and eligibility review.");

  const qualificationLabel = qualification
    ? `POD ${qualification.podNumber}`
    : "NOT STARTED";
  const qualificationDescription = qualification
    ? `Pod status: ${qualification.podStatus.replace(/_/g, " ")}${
        qualification.yourPosition
          ? ` · Your position ${qualification.yourPosition}`
          : ""
      }`
    : "Qualification begins after you are selected into the tournament.";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header>
        <h1 className="text-h2 text-text-primary">
          {experience.tournament.name.toUpperCase()}
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          {experience.tournament.game} · Tournament status:{" "}
          {experience.tournament.status.replace(/_/g, " ")}
        </p>
        <p className="mt-3 text-body-sm text-text-muted">
          Application, eligibility, selection, and qualification are separate
          stages.
        </p>
      </header>

      <div className="space-y-0">
        <JourneyStage
          title="Application"
          label={applicationLabel}
          description={applicationDescription}
        >
          {application ? (
            <p className="mt-3 text-body-sm text-text-muted">
              Reference: {application.referenceId}
            </p>
          ) : experience.profileGate.canApply ? (
            <Button
              href={`/tournaments/${TOURNAMENT_EVENT_ID}/apply`}
              className="mt-4"
            >
              Apply for tournament
            </Button>
          ) : (
            <Button
              href={getApplyGateAction(experience.profileGate.code).href}
              className="mt-4"
            >
              {getApplyGateAction(experience.profileGate.code).buttonLabel}
            </Button>
          )}
        </JourneyStage>

        <JourneyStage
          title="Eligibility"
          label={eligibilityLabel}
          description={eligibilityDescription}
        />

        <JourneyStage
          title="Selection"
          label={selectionLabel}
          description={selectionDescription}
        >
          {selection?.publicCode ? (
            <p className="mt-3 text-body-sm font-medium text-text-primary">
              Public code: {selection.publicCode}
            </p>
          ) : null}
        </JourneyStage>

        <JourneyStage
          title="Qualification"
          label={qualificationLabel}
          description={qualificationDescription}
        >
          {qualification ? (
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
          ) : null}
        </JourneyStage>
      </div>

      {application ? (
        <section className="border-t border-border pt-6">
          <h2 className="text-h4 text-text-primary">Review details</h2>
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
                Your follows are manually reviewed before participation.
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
      ) : null}

      {upcomingMatch ? (
        <section className="border-t border-border pt-6">
          <h2 className="text-h4 text-text-primary">Upcoming match</h2>
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
            className="mt-4 inline-block text-body-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            View all matches
          </Link>
        </section>
      ) : null}
    </div>
  );
}
