import {
  esportsQualification,
  esportsQualificationFlow,
} from "@/config/esports";
import { SectionShell } from "./SectionShell";
import { ChevronDown } from "lucide-react";

export function Qualification() {
  return (
    <SectionShell ariaLabelledby="qualification-heading">
      <div className="mx-auto flex max-w-4xl flex-col gap-12">
        <div className="text-center">
          <h2
            id="qualification-heading"
            className="text-h2 text-text-primary"
          >
            {esportsQualification.heading}
          </h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            {esportsQualification.intro}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-elevated p-6 text-center">
            <p className="text-label tracking-[0.12em] text-text-muted">
              Starting pool
            </p>
            <p className="mt-2 text-h2 font-bold text-brand-primary">
              {esportsQualification.startingPool}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-6 text-center">
            <p className="text-label tracking-[0.12em] text-text-muted">
              Target
            </p>
            <p className="mt-2 text-h2 font-bold text-brand-primary">
              {esportsQualification.target}
            </p>
          </div>
          <div className="rounded-xl border border-border-interactive bg-brand-primary/10 p-6 text-center">
            <p className="text-label tracking-[0.12em] text-accent">
              {esportsQualification.topLabel}
            </p>
          </div>
        </div>

        <ol
          className="flex flex-col items-center gap-0"
          aria-label="Tournament progression from qualification to champion"
        >
          {esportsQualificationFlow.map((step, index) => (
            <li key={step} className="flex flex-col items-center">
              <span className="rounded-lg border border-border-interactive/50 bg-surface px-4 py-2 text-label font-semibold tracking-wide text-text-primary">
                {step}
              </span>
              {index < esportsQualificationFlow.length - 1 && (
                <ChevronDown
                  className="my-2 size-5 text-brand-primary"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
          <h3 className="text-h3 text-text-primary">
            {esportsQualification.howItWorksHeading}
          </h3>
          <div className="mt-6 space-y-4">
            {esportsQualification.howItWorksParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="text-body text-text-secondary">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="mt-6 text-body-sm text-text-muted">
            {esportsQualification.mainStageNote}
          </p>
          <p className="mt-2 text-body-sm text-text-muted">
            {esportsQualification.totalMatchesNote}
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
