import { eligibilitySummaryItems } from "@/config/eligibility-requirements";
import { cn } from "@/lib/cn";

export interface EligibilityRequirementsProps {
  id?: string;
  className?: string;
  /** Compact layout for registration / FAQ intros. */
  compact?: boolean;
}

export function EligibilityRequirements({
  id = "eligibility-requirements",
  className,
  compact = false,
}: EligibilityRequirementsProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "rounded-2xl border border-border bg-surface-elevated",
        compact ? "p-5 md:p-6" : "p-6 md:p-8",
        className,
      )}
    >
      <h2
        id={`${id}-heading`}
        className={cn(
          "text-text-primary",
          compact ? "text-h4" : "text-h3",
        )}
      >
        ELIGIBILITY REQUIREMENTS
      </h2>
      <p className="mt-2 text-body-sm text-text-secondary">
        Application submission is not the same as eligibility or tournament
        participation.
      </p>
      <dl
        className={cn(
          "mt-6 grid gap-4",
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {eligibilitySummaryItems.map((item) => (
          <div
            key={item.label}
            className="border-l-2 border-brand-primary pl-4"
          >
            <dt className="text-label font-semibold tracking-[0.12em] text-text-muted">
              {item.label}
            </dt>
            <dd className="mt-1 text-body text-text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
