import { homepageFeaturedInitiative } from "@/config/homepage";
import { HomeCta } from "./HomeCta";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function FeaturedInitiative() {
  const data = homepageFeaturedInitiative;

  return (
    <SectionShell
      className="relative overflow-hidden border-y border-border bg-surface-elevated"
      ariaLabelledby="featured-initiative-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-primary/15 via-transparent to-accent-secondary/5"
        aria-hidden="true"
      />
      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <p className="text-label font-semibold uppercase tracking-[0.15em] text-accent">
            Currently in the Arena
          </p>
          <h2
            id="featured-initiative-heading"
            className="mt-3 text-h2 text-text-primary"
          >
            {data.title}
          </h2>
          <p className="mt-2 text-h4 font-medium text-text-secondary">
            {data.subtitle}
          </p>
          <p className="mt-4 max-w-lg text-body text-text-secondary">
            {data.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <HomeCta cta={data.primaryCta} variant="primary" />
            <HomeCta cta={data.secondaryCta} variant="outline" />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div
            className="relative rounded-2xl border border-border-interactive/50 bg-surface p-6 md:p-8"
            aria-label="Tournament statistics"
          >
            <div
              className="pointer-events-none absolute -top-8 right-4 size-32 rounded-full bg-brand-primary/20 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative grid grid-cols-2 gap-4">
              {data.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-background/60 p-4 text-center"
                >
                  <p className="text-h2 font-bold text-text-primary">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-caption text-text-muted uppercase tracking-wide">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="mt-6 flex h-24 items-center justify-center rounded-xl border border-dashed border-border-interactive/40 bg-brand-primary/5"
              aria-hidden="true"
            >
              <div className="size-16 rounded-full border-2 border-brand-primary/40 bg-gradient-to-br from-brand-primary/30 to-transparent" />
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}
