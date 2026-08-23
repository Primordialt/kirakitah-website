import { esportsHero } from "@/config/esports";
import { Button } from "@/components/ui";
import { EsportsHeroVisual } from "./EsportsHeroVisual";
import { SectionShell } from "./SectionShell";
import { TournamentStats } from "./TournamentStats";
import { esportsStats } from "@/config/esports";

export function EsportsHero() {
  return (
    <SectionShell
      className="relative overflow-hidden py-20 md:py-28 lg:py-32"
      containerClassName="relative z-10 flex flex-col gap-10 md:gap-12"
    >
      <EsportsHeroVisual />
      <div className="relative flex flex-col gap-8 md:max-w-3xl lg:max-w-4xl">
        <p className="text-label font-semibold tracking-[0.2em] text-accent">
          {esportsHero.eyebrow}
        </p>
        <h1 className="text-display text-text-primary">{esportsHero.headline}</h1>
        <p className="max-w-xl text-body-lg text-text-secondary">
          {esportsHero.supportingCopy}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button href={esportsHero.primaryCta.href} size="lg">
            {esportsHero.primaryCta.label}
          </Button>
          <Button href={esportsHero.secondaryCta.href} variant="outline" size="lg">
            {esportsHero.secondaryCta.label}
          </Button>
        </div>
      </div>
      <TournamentStats stats={esportsStats} />
    </SectionShell>
  );
}
