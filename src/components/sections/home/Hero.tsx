import { homepageHero } from "@/config/homepage";
import { HomeCta } from "./HomeCta";
import { HeroVisual } from "./HeroVisual";
import { SectionShell } from "./SectionShell";

export function Hero() {
  return (
    <SectionShell
      className="relative overflow-hidden py-20 md:py-28 lg:py-32"
      containerClassName="relative z-10"
    >
      <HeroVisual />
      <div className="relative flex flex-col gap-8 md:max-w-3xl lg:max-w-4xl">
        <p className="text-label font-semibold tracking-[0.2em] text-accent">
          {homepageHero.eyebrow}
        </p>
        <h1 className="text-display text-text-primary">{homepageHero.headline}</h1>
        <p className="max-w-xl text-body-lg text-text-secondary">
          {homepageHero.supportingCopy}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <HomeCta cta={homepageHero.primaryCta} variant="primary" />
          <HomeCta cta={homepageHero.secondaryCta} variant="outline" />
        </div>
      </div>
    </SectionShell>
  );
}
