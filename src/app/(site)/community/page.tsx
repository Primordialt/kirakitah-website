import { Reveal, SectionShell } from "@/components/sections/home";
import { Button } from "@/components/ui";
import { communityPageContent } from "@/config/pages";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const { hero, features, status, cta } = communityPageContent;

const description =
  "Join the KIRAKITAH community — a growing space for competition, creativity, connection and participation across the KIRAKITAH ecosystem.";

export const metadata: Metadata = {
  title: "Community — KIRAKITAH",
  description,
  openGraph: {
    title: "Community — KIRAKITAH",
    description,
    url: `${siteConfig.url}/community`,
    siteName: siteConfig.name,
    type: "website",
  },
  alternates: { canonical: `${siteConfig.url}/community` },
};

export default function CommunityPage() {
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

      <SectionShell ariaLabelledby="community-features-heading">
        <Reveal>
          <h2 id="community-features-heading" className="text-h2 text-text-primary">
            {features.heading}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 60}>
              <article className="rounded-xl border border-border bg-surface p-6">
                <h3 className="text-h4 text-brand-primary">{item.title}</h3>
                <p className="mt-2 text-body text-text-secondary">
                  {item.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        className="border-t border-border bg-surface/40"
        ariaLabelledby="community-status-heading"
      >
        <Reveal>
          <h2 id="community-status-heading" className="text-h2 text-text-primary">
            {status.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg text-text-secondary">
            {status.copy}
          </p>
          <Button href={cta.href} className="mt-8">
            {cta.label}
          </Button>
        </Reveal>
      </SectionShell>
    </>
  );
}
