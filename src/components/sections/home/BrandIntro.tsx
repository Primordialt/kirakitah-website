import { homepageBrandIntro } from "@/config/homepage";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function BrandIntro() {
  return (
    <SectionShell
      className="border-t border-border bg-surface/50"
      ariaLabelledby="brand-intro-heading"
    >
      <Reveal>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end lg:gap-16">
          <div className="relative">
            <div
              className="absolute -top-6 -left-2 text-[5rem] font-bold leading-none text-brand-primary/10 md:text-[7rem]"
              aria-hidden="true"
            >
              K
            </div>
            <h2
              id="brand-intro-heading"
              className="relative text-h1 text-text-primary"
            >
              {homepageBrandIntro.heading}
            </h2>
          </div>
          <div className="flex flex-col gap-6">
            {homepageBrandIntro.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="text-body-lg text-text-secondary">
                {paragraph}
              </p>
            ))}
            <div className="flex flex-wrap gap-2" aria-hidden="true">
              {["Technology", "Culture", "Competition", "Creativity", "Community"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border px-3 py-1 text-caption text-text-muted"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
