import { Button } from "@/components/ui";
import { COMPETITION_NAME } from "@/config/competition";
import type { ApplicationPreflight } from "@/server/participant/application-preflight";

function CheckRow({
  check,
}: {
  check: ApplicationPreflight["accountChecks"][number];
}) {
  return (
    <li className="border-t border-border py-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-text-primary">
            <span aria-hidden="true">{check.ready ? "✓ " : "○ "}</span>
            {check.label}
          </p>
          <p className="mt-1 text-body-sm text-text-secondary">{check.detail}</p>
          <p className="sr-only">{check.ready ? "Ready" : "Not ready"}</p>
        </div>
        {!check.ready ? (
          <span className="shrink-0 text-caption font-semibold uppercase tracking-wide text-warning">
            Not ready
          </span>
        ) : (
          <span className="shrink-0 text-caption font-semibold uppercase tracking-wide text-success">
            Ready
          </span>
        )}
      </div>
      {!check.ready && check.actionHref && check.actionLabel ? (
        <Button href={check.actionHref} variant="secondary" className="mt-3">
          {check.actionLabel}
        </Button>
      ) : null}
    </li>
  );
}

export function ApplicationPreflightPanel({
  preflight,
  tournamentId,
  onContinue,
}: {
  preflight: ApplicationPreflight;
  tournamentId: string;
  onContinue?: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
          {COMPETITION_NAME}
        </p>
        <h1 className="text-h2 text-text-primary">Application check</h1>
        <p className="text-body text-text-secondary">
          Before you apply, we check that your account is ready. Application
          submission does not mean eligibility, selection, or qualification.
        </p>
      </header>

      {preflight.blockingMessage ? (
        <p className="text-body-sm text-error" role="alert">
          {preflight.blockingMessage}
        </p>
      ) : null}

      <section aria-labelledby="account-check-heading">
        <h2 id="account-check-heading" className="text-h4 text-text-primary">
          Account readiness
        </h2>
        <ul className="mt-4">
          {preflight.accountChecks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="requirements-heading">
        <h2 id="requirements-heading" className="text-h4 text-text-primary">
          Application requirements
        </h2>
        <ul className="mt-4">
          {preflight.requirementChecks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        {preflight.canContinue && onContinue ? (
          <Button type="button" onClick={onContinue}>
            Continue to application
          </Button>
        ) : null}
        {preflight.blockingCode === "DUPLICATE_APPLICATION" ? (
          <Button href={`/tournaments/${tournamentId}`}>View application</Button>
        ) : null}
        <Button href="/tournaments" variant="secondary">
          Back to tournaments
        </Button>
        <Button href="/dashboard" variant="ghost">
          Dashboard
        </Button>
      </div>
    </div>
  );
}
