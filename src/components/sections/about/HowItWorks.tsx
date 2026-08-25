import { aboutContent } from "@/config/about";
import { Reveal, SectionShell } from "@/components/sections/home";

export function HowItWorks() {
  const { howItWorks } = aboutContent;
  return (
    <SectionShell
      className="border-y border-border bg-surface/40"
      ariaLabelledby="how-it-works-heading"
    >
      <Reveal>
        <h2 id="how-it-works-heading" className="text-h2 text-text-primary">
          {howItWorks.heading}
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {howItWorks.items.map((item, index) => (
          <Reveal key={item.id} delay={index * 60}>
            <article className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-h4 text-brand-primary">{item.title}</h3>
              <p className="mt-2 text-body text-text-secondary">{item.description}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
