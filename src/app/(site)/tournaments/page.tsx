import { Button } from "@/components/ui";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { COMPETITION_NAME, TOURNAMENT_EVENT_ID } from "@/config/competition";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournaments — KIRAKITAH",
  description: `Browse KIRAKITAH tournaments including ${COMPETITION_NAME}.`,
  alternates: { canonical: `${siteConfig.url}/tournaments` },
};

export default function TournamentsPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <h1 className="text-h2 text-text-primary">TOURNAMENTS</h1>
      <p className="mt-3 text-body text-text-secondary">
        Open competitions you can apply for once your participant profile is
        verified.
      </p>

      <article className="mt-10 border-t border-border pt-8">
        <h2 className="text-h3 text-text-primary">{COMPETITION_NAME}</h2>
        <p className="mt-2 text-body text-text-secondary">
          The inaugural eFootball Mobile championship. Create an account,
          complete your profile, and apply when verified.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={`/tournaments/${TOURNAMENT_EVENT_ID}/apply`}>
            APPLY
          </Button>
          <Button href="/esports" variant="secondary">
            Tournament info
          </Button>
          <Button href="/register" variant="ghost">
            Register account
          </Button>
        </div>
      </article>
    </SectionShell>
  );
}
