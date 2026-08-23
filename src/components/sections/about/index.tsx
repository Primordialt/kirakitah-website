import { aboutContent } from "@/config/about";
import { Reveal, SectionShell } from "@/components/sections/home";
import { Button } from "@/components/ui";

export function AboutHero() {
  const { hero, parentOrganisation } = aboutContent;
  return (
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
        <p className="mt-8 text-caption text-text-muted">{parentOrganisation.label}</p>
      </Reveal>
    </SectionShell>
  );
}

export function WhoWeAre() {
  const { whoWeAre } = aboutContent;
  return (
    <SectionShell ariaLabelledby="who-we-are-heading">
      <Reveal>
        <h2 id="who-we-are-heading" className="max-w-3xl text-h1 text-text-primary">
          {whoWeAre.heading}
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-16">
        {whoWeAre.paragraphs.map((paragraph, index) => (
          <Reveal key={paragraph.slice(0, 24)} delay={index * 80}>
            <p className="text-body-lg text-text-secondary">{paragraph}</p>
          </Reveal>
        ))}
      </div>
      <Reveal delay={160}>
        <ul className="mt-10 flex flex-wrap gap-3" aria-label="Platform pillars">
          {whoWeAre.pillars.map((pillar) => (
            <li
              key={pillar}
              className="rounded-lg border border-border-interactive/40 bg-brand-primary/10 px-4 py-2 text-label font-medium text-text-primary"
            >
              {pillar}
            </li>
          ))}
        </ul>
      </Reveal>
    </SectionShell>
  );
}

export function WhyWeExist() {
  const { whyWeExist } = aboutContent;
  return (
    <SectionShell
      className="border-y border-border bg-surface/40"
      ariaLabelledby="why-heading"
    >
      <Reveal>
        <h2 id="why-heading" className="text-h2 text-text-primary">
          {whyWeExist.heading}
        </h2>
      </Reveal>
      <div className="mt-8 max-w-3xl space-y-6">
        {whyWeExist.paragraphs.map((paragraph, index) => (
          <Reveal key={paragraph.slice(0, 24)} delay={index * 80}>
            <p className="text-body-lg text-text-secondary">{paragraph}</p>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

export function AboutPrinciples() {
  const { principles } = aboutContent;
  return (
    <SectionShell ariaLabelledby="about-principles-heading">
      <Reveal>
        <h2 id="about-principles-heading" className="text-h2 text-text-primary">
          {principles.heading}
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {principles.items.map((item, index) => (
          <Reveal key={item.id} delay={index * 60}>
            <article className="rounded-xl border border-border bg-surface p-6 transition-standard hover:border-border-interactive">
              <h3 className="text-h4 text-brand-primary">{item.title}</h3>
              <p className="mt-2 text-body text-text-secondary">{item.description}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

export function WhatWereBuilding() {
  const { whatWereBuilding } = aboutContent;
  return (
    <SectionShell
      className="border-t border-border bg-surface-elevated/30"
      ariaLabelledby="building-heading"
    >
      <Reveal>
        <h2 id="building-heading" className="max-w-3xl text-h2 text-text-primary">
          {whatWereBuilding.heading}
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        {whatWereBuilding.paragraphs.map((paragraph, index) => (
          <Reveal key={paragraph.slice(0, 24)} delay={index * 80}>
            <p className="text-body-lg text-text-secondary">{paragraph}</p>
          </Reveal>
        ))}
      </div>
      <Reveal delay={120}>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {whatWereBuilding.growthAreas.map((area) => (
            <li
              key={area}
              className="rounded-lg border border-border px-3 py-3 text-center text-caption text-text-muted"
            >
              {area}
            </li>
          ))}
        </ul>
      </Reveal>
    </SectionShell>
  );
}

export function AboutEcosystem() {
  const { ecosystem } = aboutContent;
  return (
    <SectionShell ariaLabelledby="about-ecosystem-heading">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
        <Reveal>
          <h2 id="about-ecosystem-heading" className="text-h2 text-text-primary">
            {ecosystem.heading}
          </h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            {ecosystem.supportingCopy}
          </p>
          <Button href={ecosystem.cta.href} className="mt-8">
            {ecosystem.cta.label}
          </Button>
        </Reveal>
        <Reveal delay={100}>
          <ul className="flex flex-col gap-3">
            {ecosystem.items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 border-b border-border py-3 text-body text-text-primary"
              >
                <span
                  className="size-2 shrink-0 rounded-full bg-brand-primary"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </SectionShell>
  );
}

export function AboutFinalCta() {
  const { finalCta } = aboutContent;
  return (
    <SectionShell className="pb-20">
      <Reveal>
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center md:px-12">
          <h2 className="text-h2 text-text-primary">{finalCta.heading}</h2>
          <p className="mx-auto mt-4 max-w-lg text-body text-text-secondary">
            {finalCta.supportingCopy}
          </p>
          <Button href={finalCta.cta.href} className="mt-8">
            {finalCta.cta.label}
          </Button>
        </div>
      </Reveal>
    </SectionShell>
  );
}
