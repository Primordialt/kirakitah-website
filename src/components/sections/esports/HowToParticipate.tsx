import { howToParticipateSteps } from "@/config/eligibility-requirements";
import { ChevronDown } from "lucide-react";
import { SectionShell } from "./SectionShell";

export function HowToParticipate() {
  return (
    <SectionShell
      id="how-to-participate"
      className="border-t border-border bg-surface/50"
      ariaLabelledby="how-to-participate-heading"
    >
      <h2
        id="how-to-participate-heading"
        className="text-h2 text-text-primary"
      >
        HOW TO PARTICIPATE
      </h2>
      <p className="mt-4 max-w-2xl text-body-lg text-text-secondary">
        Submitting an application does not automatically qualify you for the
        tournament. Follow each step below.
      </p>

      <ol className="mt-10 max-w-2xl space-y-0">
        {howToParticipateSteps.map((step, index) => (
          <li key={step.step} className="flex flex-col">
            <div className="rounded-xl border border-border bg-surface-elevated p-5 md:p-6">
              <span className="text-h3 font-bold text-brand-primary">
                {step.step}
              </span>
              <h3 className="mt-2 text-body font-semibold tracking-wide text-text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-body-sm text-text-secondary">
                {step.description}
              </p>
            </div>
            {index < howToParticipateSteps.length - 1 ? (
              <div
                className="flex items-center justify-center py-3 text-brand-primary"
                aria-hidden="true"
              >
                <ChevronDown className="size-6" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
