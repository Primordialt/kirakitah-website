import { homepageCommunity } from "@/config/homepage";
import { HomeCta } from "./HomeCta";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function Community() {
  return (
    <SectionShell
      className="border-t border-border bg-surface/40"
      ariaLabelledby="community-heading"
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <h2 id="community-heading" className="text-h2 text-text-primary">
            {homepageCommunity.heading}
          </h2>
          <p className="mt-4 max-w-lg text-body-lg text-text-secondary">
            {homepageCommunity.supportingCopy}
          </p>
          <div className="mt-8">
            <HomeCta cta={homepageCommunity.primaryCta} variant="primary" />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div
            className="relative grid grid-cols-2 gap-3 sm:grid-cols-3"
            aria-hidden="true"
          >
            {homepageCommunity.roles.map((role, index) => (
              <div
                key={role}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border border-border bg-surface-elevated p-4 text-center transition-standard hover:border-border-interactive"
                style={{ transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)` }}
              >
                <span className="mb-2 size-8 rounded-full bg-brand-primary/20" />
                <span className="text-caption font-medium text-text-secondary">
                  {role}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}
