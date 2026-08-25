import { socialRequirementCopy } from "@/config/eligibility-requirements";
import { SectionShell } from "./SectionShell";

export function SocialRequirementCallout() {
  const { title, lead, platforms, points, applicationNote } =
    socialRequirementCopy;

  return (
    <SectionShell
      id="social-requirement"
      ariaLabelledby="social-requirement-heading"
    >
      <aside
        className="rounded-2xl border-2 border-brand-primary bg-surface-elevated p-6 md:p-8"
        aria-labelledby="social-requirement-heading"
      >
        <p className="text-label font-semibold tracking-[0.16em] text-brand-primary">
          REQUIRED
        </p>
        <h2
          id="social-requirement-heading"
          className="mt-3 text-h3 text-text-primary"
        >
          {title}
        </h2>
        <p className="mt-4 text-body text-text-secondary">{lead}</p>
        <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {platforms.map((account) => (
            <li key={account.platform}>
              <a
                href={account.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-lg border border-border-interactive bg-surface px-4 py-2 text-button text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50"
              >
                {account.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-body-sm text-text-secondary">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="mt-6 border-t border-border pt-4 text-body-sm font-medium text-text-primary">
          {applicationNote}
        </p>
      </aside>
    </SectionShell>
  );
}
