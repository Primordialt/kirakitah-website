import { homepageFinalCta } from "@/config/homepage";
import { HomeCta } from "./HomeCta";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function FinalCTA() {
  return (
    <SectionShell className="pb-20 md:pb-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border-interactive/40 bg-gradient-brand px-6 py-14 text-center md:px-12 md:py-20">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-60"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="max-w-2xl text-h1 text-white">
              {homepageFinalCta.headline}
            </h2>
            <p className="max-w-md text-body-lg text-white/80">
              {homepageFinalCta.supportingCopy}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <HomeCta
                cta={homepageFinalCta.primaryCta}
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              />
              <HomeCta
                cta={homepageFinalCta.secondaryCta}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              />
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
