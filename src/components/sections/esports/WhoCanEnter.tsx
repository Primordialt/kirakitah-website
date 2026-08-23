import { esportsWhoCanEnter } from "@/config/esports";
import { Button } from "@/components/ui";
import { SectionShell } from "./SectionShell";

export function WhoCanEnter() {
  return (
    <SectionShell
      className="border-t border-border bg-surface/40"
      ariaLabelledby="who-can-enter-heading"
    >
      <h2 id="who-can-enter-heading" className="text-h2 text-text-primary">
        {esportsWhoCanEnter.heading}
      </h2>
      <div className="mt-6 max-w-3xl space-y-4">
        {esportsWhoCanEnter.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-body-lg text-text-secondary">
            {paragraph}
          </p>
        ))}
      </div>
      <Button href={esportsWhoCanEnter.cta.href} variant="outline" className="mt-8">
        {esportsWhoCanEnter.cta.label}
      </Button>
    </SectionShell>
  );
}
