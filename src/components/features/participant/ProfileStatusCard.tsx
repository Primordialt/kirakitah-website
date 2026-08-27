import { Button } from "@/components/ui";
import {
  getDashboardProfileCta,
  getProfileStatusLabel,
  type ParticipantProfileStatus,
} from "@/lib/participant/dashboard-status";
import { getProfilePresentation } from "@/lib/participant/profile-presentation";

export type ProfileStatusCardProps = {
  status: ParticipantProfileStatus;
  completionPercent: number;
  correctionReason?: string | null;
  showExploreDistinction?: boolean;
};

export function ProfileStatusCard({
  status,
  completionPercent,
  correctionReason = null,
  showExploreDistinction = true,
}: ProfileStatusCardProps) {
  const presentation = getProfilePresentation(status, completionPercent);
  const cta = getDashboardProfileCta(status, completionPercent);
  const clamped = Math.max(0, Math.min(100, completionPercent));

  return (
    <section
      aria-labelledby="profile-status-heading"
      className="rounded-xl border border-border bg-surface p-5"
    >
      <h2 id="profile-status-heading" className="text-h4 text-text-primary">
        PROFILE STATUS
      </h2>
      <p className="mt-1 text-body-sm text-text-muted">
        Account is for sign-in. Profile is reviewed separately from tournament
        applications.
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-body-sm font-medium text-text-primary">
            Profile completion
          </p>
          <p className="text-body-sm text-text-secondary" aria-live="polite">
            {clamped}%
          </p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clamped}
          aria-label="Profile completion"
        >
          <div
            className="h-full rounded-full bg-brand-primary transition-standard"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>

      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-caption font-medium uppercase tracking-wide text-text-muted">
            Verification
          </dt>
          <dd className="mt-1 text-body font-semibold text-text-primary">
            {presentation.verificationLabel}
            <span className="sr-only">
              {" "}
              ({getProfileStatusLabel(status)})
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-caption font-medium uppercase tracking-wide text-text-muted">
            Next action
          </dt>
          <dd className="mt-1 text-body-sm text-text-secondary">
            {presentation.description}
          </dd>
        </div>
      </dl>

      {status === "needs_correction" && correctionReason ? (
        <p className="mt-4 text-body-sm text-error" role="status">
          Update required: {correctionReason}
        </p>
      ) : null}

      {status === "verified" && showExploreDistinction ? (
        <p className="mt-4 text-body-sm font-medium text-success" role="status">
          PROFILE VERIFIED ✓
        </p>
      ) : null}

      <div className="mt-5">
        <Button href={cta.href}>{cta.buttonLabel}</Button>
      </div>
    </section>
  );
}
