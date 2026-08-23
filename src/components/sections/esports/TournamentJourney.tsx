import { esportsJourneySteps } from "@/config/esports";
import { SectionShell } from "./SectionShell";
import { ChevronDown } from "lucide-react";

export function TournamentJourney() {
  return (
    <SectionShell
      className="bg-surface/50"
      ariaLabelledby="tournament-journey-heading"
    >
      <div className="flex flex-col gap-12">
        <h2
          id="tournament-journey-heading"
          className="text-h2 text-text-primary"
        >
          TOURNAMENT JOURNEY
        </h2>

        <ol className="flex flex-col gap-0 md:flex-row md:items-start md:gap-4 lg:gap-6">
          {esportsJourneySteps.map((step, index) => (
            <li
              key={step.step}
              className="flex flex-1 flex-col items-center md:items-stretch"
            >
              <div className="flex w-full max-w-sm flex-col items-center text-center md:max-w-none md:text-left">
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
              {index < esportsJourneySteps.length - 1 && (
                <div
                  className="flex items-center justify-center py-4 text-brand-primary md:hidden"
                  aria-hidden="true"
                >
                  <ChevronDown className="size-6" />
                </div>
              )}
              {index < esportsJourneySteps.length - 1 && (
                <div
                  className="mx-2 mt-8 hidden flex-1 items-center md:flex"
                  aria-hidden="true"
                >
                  <div className="h-px flex-1 bg-border-interactive" />
                  <ChevronDown className="mx-1 size-4 rotate-[-90deg] text-brand-primary" />
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </SectionShell>
  );
}
