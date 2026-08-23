import { esportsFinalCta } from "@/config/esports";
import { Button } from "@/components/ui";
import { SectionShell } from "./SectionShell";

export function EsportsFinalCTA() {
  return (
    <SectionShell
      className="bg-surface/50"
      ariaLabelledby="esports-final-cta-heading"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2
          id="esports-final-cta-heading"
          className="text-h2 text-text-primary"
        >
          {esportsFinalCta.title}
        </h2>
        <p className="text-body-lg text-text-secondary">{esportsFinalCta.copy}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href={esportsFinalCta.primaryCta.href} size="lg">
            {esportsFinalCta.primaryCta.label}
          </Button>
          <Button
            href={esportsFinalCta.secondaryCta.href}
            variant="outline"
            size="lg"
          >
            {esportsFinalCta.secondaryCta.label}
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}
