import { esportsQualification } from "@/config/esports";
import { SectionShell } from "./SectionShell";

export function Qualification() {
  return (
    <SectionShell ariaLabelledby="qualification-heading">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
        <h2
          id="qualification-heading"
          className="text-h2 text-text-primary"
        >
          QUALIFICATION
        </h2>
        <p className="text-body-lg text-text-secondary">
          {esportsQualification.intro}
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-elevated p-6">
            <p className="text-label tracking-[0.12em] text-text-muted">
              Starting pool
            </p>
            <p className="mt-2 text-h2 font-bold text-brand-primary">
              {esportsQualification.startingPool}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-6">
            <p className="text-label tracking-[0.12em] text-text-muted">
              Target
            </p>
            <p className="mt-2 text-h2 font-bold text-brand-primary">
              {esportsQualification.target}
            </p>
          </div>
          <div className="rounded-xl border border-border-interactive bg-brand-primary/10 p-6">
            <p className="text-label tracking-[0.12em] text-accent">
              {esportsQualification.topLabel}
            </p>
          </div>
        </div>
        <p className="text-body-sm text-text-muted italic">
          {esportsQualification.pendingNote}
        </p>
      </div>
    </SectionShell>
  );
}
