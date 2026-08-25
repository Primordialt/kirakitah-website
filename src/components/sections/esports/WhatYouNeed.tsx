import { esportsWhatYouNeed } from "@/config/esports";
import { SectionShell } from "./SectionShell";

export function WhatYouNeed() {
  return (
    <SectionShell ariaLabelledby="what-you-need-heading">
      <h2 id="what-you-need-heading" className="text-h2 text-text-primary">
        {esportsWhatYouNeed.heading}
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {esportsWhatYouNeed.items.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-border bg-surface-elevated p-6"
          >
            <h3 className="text-body font-semibold tracking-wide text-text-primary">
              {item.title}
            </h3>
            <p className="mt-2 text-body-sm text-text-secondary">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
