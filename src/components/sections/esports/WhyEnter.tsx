import { esportsWhyEnter } from "@/config/esports";
import { Button } from "@/components/ui";
import { SectionShell } from "./SectionShell";

export function WhyEnter() {
  return (
    <SectionShell
      className="bg-surface/50"
      ariaLabelledby="why-enter-heading"
    >
      <h2 id="why-enter-heading" className="text-h2 text-text-primary">
        {esportsWhyEnter.heading}
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {esportsWhyEnter.items.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <h3 className="text-h4 text-brand-primary">{item.title}</h3>
            <p className="mt-2 text-body text-text-secondary">{item.description}</p>
          </article>
        ))}
      </div>
      <Button href={esportsWhyEnter.cta.href} className="mt-10">
        {esportsWhyEnter.cta.label}
      </Button>
    </SectionShell>
  );
}
