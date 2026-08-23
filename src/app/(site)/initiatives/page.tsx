import { initiativesPageContent } from "@/config/about";
import { InitiativeCardGrid } from "@/components/shared/initiative/InitiativeCard";
import { Reveal, SectionShell } from "@/components/sections/home";
import { services } from "@/services";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description =
  "Explore the KIRAKITAH ecosystem — initiatives spanning gaming, innovation, creativity, community and experiences.";

export const metadata: Metadata = {
  title: "Initiatives — KIRAKITAH",
  description,
  openGraph: {
    title: "Initiatives — KIRAKITAH",
    description,
    url: `${siteConfig.url}/initiatives`,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Initiatives — KIRAKITAH",
    description,
  },
  alternates: { canonical: `${siteConfig.url}/initiatives` },
};

export default async function InitiativesPage() {
  const initiatives = await services.initiatives.getAll();
  const { hero } = initiativesPageContent;

  return (
    <>
      <SectionShell className="border-b border-border pt-12 md:pt-16">
        <Reveal>
          <p className="text-label font-semibold tracking-[0.15em] text-accent">
            {hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-display text-text-primary">
            {hero.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-body-lg text-text-secondary">
            {hero.supportingCopy}
          </p>
        </Reveal>
      </SectionShell>

      <SectionShell ariaLabelledby="initiatives-list-heading">
        <Reveal>
          <h2 id="initiatives-list-heading" className="sr-only">
            KIRAKITAH initiatives
          </h2>
        </Reveal>
        <InitiativeCardGrid initiatives={initiatives} />
      </SectionShell>
    </>
  );
}
