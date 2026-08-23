import { esportsRulesPreview } from "@/config/esports";
import { Button } from "@/components/ui";
import { SectionShell } from "./SectionShell";

export function RulesPreview() {
  return (
    <SectionShell
      className="bg-surface/50"
      ariaLabelledby="rules-preview-heading"
    >
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-border-interactive bg-brand-primary/10 p-8 md:p-12">
        <h2
          id="rules-preview-heading"
          className="text-h2 text-text-primary"
        >
          {esportsRulesPreview.title}
        </h2>
        <p className="max-w-xl text-body-lg text-text-secondary">
          {esportsRulesPreview.copy}
        </p>
        <Button href={esportsRulesPreview.href} size="lg">
          {esportsRulesPreview.title}
        </Button>
      </div>
    </SectionShell>
  );
}
