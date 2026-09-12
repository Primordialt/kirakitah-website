"use client";

import Link from "next/link";
import { FixtureCard } from "@/components/features/participant/FixtureCard";
import { FixtureTabGroup } from "@/components/features/participant/FixtureTabGroup";
import { TournamentFixtureCard } from "@/components/features/participant/TournamentFixtureCard";
import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import type {
  ParticipantFixtureBundle,
  ParticipantFixtureView,
  TournamentFixtureView,
} from "@/server/participant/participant-fixture-service";
import { useEffect, useState } from "react";

type FixtureScope = "all" | "mine";
type FixtureSection = "upcoming" | "completed";

const emptyBundle: ParticipantFixtureBundle = {
  all: { upcoming: [], completed: [] },
  mine: { upcoming: [], completed: [] },
};

export function FixturesClient() {
  const [bundle, setBundle] = useState<ParticipantFixtureBundle>(emptyBundle);
  const [scope, setScope] = useState<FixtureScope>("all");
  const [section, setSection] = useState<FixtureSection>("upcoming");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<{
        all?: ParticipantFixtureBundle["all"];
        mine?: ParticipantFixtureBundle["mine"];
      }>("/api/participant/fixtures");

      if (cancelled) return;
      setLoading(false);

      if (!response.ok) {
        setError(apiErrorMessage(payload, "Unable to load fixtures."));
        return;
      }

      setBundle({
        all: payload.all ?? emptyBundle.all,
        mine: payload.mine ?? emptyBundle.mine,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading fixtures…
      </p>
    );
  }

  const allUpcoming = bundle.all.upcoming;
  const allCompleted = bundle.all.completed;
  const mineUpcoming = bundle.mine.upcoming;
  const mineCompleted = bundle.mine.completed;

  const activeFixtures: Array<ParticipantFixtureView | TournamentFixtureView> =
    scope === "all"
      ? section === "upcoming"
        ? allUpcoming
        : allCompleted
      : section === "upcoming"
        ? mineUpcoming
        : mineCompleted;

  const upcomingCount = scope === "all" ? allUpcoming.length : mineUpcoming.length;
  const completedCount = scope === "all" ? allCompleted.length : mineCompleted.length;

  const emptyTitle =
    scope === "all"
      ? section === "upcoming"
        ? "No upcoming fixtures yet"
        : "No completed fixtures yet"
      : section === "upcoming"
        ? "No upcoming matches"
        : "No completed matches";

  const emptyDescription =
    scope === "all"
      ? section === "upcoming"
        ? "Tournament fixtures will appear here when they are scheduled."
        : "Completed tournament fixtures will appear here."
      : section === "upcoming"
        ? "You don't have any upcoming matches yet."
        : "You haven't completed any matches yet.";

  const sectionPanelId = `fixtures-${scope}-${section}-panel`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-h2 text-text-primary">FIXTURES</h1>
        <p className="mt-2 text-body text-text-secondary">
          Follow the tournament schedule or view your own matches.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}

      <FixtureTabGroup
        label="Fixture scope"
        value={scope}
        onChange={setScope}
        options={[
          { id: "all", label: "All fixtures" },
          { id: "mine", label: "My matches" },
        ]}
      />

      <FixtureTabGroup
        label="Fixture section"
        value={section}
        onChange={setSection}
        options={[
          { id: "upcoming", label: "Upcoming", count: upcomingCount },
          { id: "completed", label: "Completed", count: completedCount },
        ]}
      />

      <section
        role="tabpanel"
        id={sectionPanelId}
        aria-labelledby={`fixture-section-${section}`}
      >
        <h2 className="sr-only">
          {scope === "all" ? "All fixtures" : "My matches"} ·{" "}
          {section === "upcoming" ? "Upcoming" : "Completed"}
        </h2>

        {activeFixtures.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-body font-medium text-text-primary">{emptyTitle}</p>
            <p className="mt-2 text-body-sm text-text-secondary">{emptyDescription}</p>
            {scope === "mine" && section === "upcoming" ? (
              <Button href="/dashboard" variant="secondary" className="mt-4">
                Back to dashboard
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="mt-2 space-y-4">
            {activeFixtures.map((fixture) => (
              <li key={fixture.matchId}>
                {scope === "all" ? (
                  <TournamentFixtureCard
                    fixture={fixture as TournamentFixtureView}
                    variant={section}
                  />
                ) : (
                  <FixtureCard
                    fixture={fixture as ParticipantFixtureView}
                    variant={section}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-body-sm text-text-muted">
        <Link href="/tournaments" className="text-accent underline">
          View tournaments
        </Link>
      </p>
    </div>
  );
}
