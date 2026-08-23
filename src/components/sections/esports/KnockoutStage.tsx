import { esportsKnockoutRounds } from "@/config/esports";
import { SectionShell } from "./SectionShell";
import { ChevronDown } from "lucide-react";

export function KnockoutStage() {
  return (
    <SectionShell
      className="bg-surface/50"
      ariaLabelledby="knockout-heading"
    >
      <div className="flex flex-col gap-10">
        <h2
          id="knockout-heading"
          className="text-h2 text-text-primary"
        >
          KNOCKOUT STAGE
        </h2>
        <ol className="mx-auto flex max-w-md flex-col items-center gap-0 md:max-w-none md:flex-row md:justify-between md:gap-4">
          {esportsKnockoutRounds.map((round, index) => (
            <li
              key={round.title}
              className="flex w-full flex-col items-center md:flex-1"
            >
              <div className="w-full rounded-xl border border-border-interactive bg-surface-elevated px-6 py-4 text-center">
                <span className="text-body font-semibold tracking-wide text-text-primary">
                  {round.title.toUpperCase()}
                </span>
              </div>
              {index < esportsKnockoutRounds.length - 1 && (
                <div
                  className="flex items-center justify-center py-3 text-brand-primary md:hidden"
                  aria-hidden="true"
                >
                  <ChevronDown className="size-5" />
                </div>
              )}
              {index < esportsKnockoutRounds.length - 1 && (
                <div
                  className="mx-2 mt-6 hidden flex-1 items-center md:flex"
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
