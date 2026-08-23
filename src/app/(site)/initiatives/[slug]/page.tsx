import { Button, Badge } from "@/components/ui";
import { Reveal, SectionShell } from "@/components/sections/home";
import {
  getInitiativeCategoryLabel,
  getInitiativeStatusLabel,
  getInitiativeStatusVariant,
} from "@/lib/initiative-display";
import { services } from "@/services";
import { COMPETITION_NAME } from "@/config/competition";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface InitiativeDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: InitiativeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const initiative = await services.initiatives.getBySlug(slug);

  if (!initiative) {
    return { title: "Initiative Not Found — KIRAKITAH" };
  }

  return {
    title: `${initiative.name} — KIRAKITAH`,
    description: initiative.description,
    alternates: { canonical: `${siteConfig.url}/initiatives/${slug}` },
  };
}

export default async function InitiativeDetailPage({
  params,
}: InitiativeDetailPageProps) {
  const { slug } = await params;
  const initiative = await services.initiatives.getBySlug(slug);

  if (!initiative) {
    notFound();
  }

  const statusLabel = getInitiativeStatusLabel(initiative.status);

  return (
    <>
      <SectionShell className="border-b border-border pt-12 md:pt-16">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {getInitiativeCategoryLabel(initiative.category)}
            </Badge>
            <Badge variant={getInitiativeStatusVariant(initiative.status)}>
              <span className="sr-only">Status: </span>
              {statusLabel}
            </Badge>
          </div>
          <h1 className="mt-6 max-w-4xl text-display text-text-primary">
            {initiative.name}
          </h1>
          <p className="mt-4 max-w-2xl text-h4 font-medium text-text-secondary">
            {initiative.tagline}
          </p>
          <p className="mt-6 max-w-2xl text-body-lg text-text-secondary">
            {initiative.description}
          </p>
          {initiative.body?.map((paragraph) => (
            <p
              key={paragraph.slice(0, 32)}
              className="mt-4 max-w-2xl text-body-lg text-text-secondary"
            >
              {paragraph}
            </p>
          ))}
        </Reveal>
      </SectionShell>

      {initiative.slug === "kirakitah-gaming" && (
        <SectionShell ariaLabelledby="gaming-next-steps">
          <Reveal>
            <h2 id="gaming-next-steps" className="text-h2 text-text-primary">
              Explore KIRAKITAH Gaming
            </h2>
            <p className="mt-4 max-w-2xl text-body text-text-secondary">
              KIRAKITAH Gaming is the platform&apos;s first major active initiative.
              The full competition experience — including {COMPETITION_NAME} —
              lives on the dedicated eSports section.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/esports">Explore KIRAKITAH Gaming</Button>
              <Button href="/initiatives" variant="outline">
                All Initiatives
              </Button>
            </div>
          </Reveal>
        </SectionShell>
      )}

      {initiative.slug === "community" && (
        <SectionShell>
          <Reveal>
            <Button href="/community">Explore Community</Button>
          </Reveal>
        </SectionShell>
      )}

      {initiative.status !== "active" && initiative.slug !== "kirakitah-gaming" && (
        <SectionShell>
          <Reveal>
            <Button href="/initiatives" variant="outline">
              Back to Initiatives
            </Button>
          </Reveal>
        </SectionShell>
      )}
    </>
  );
}
