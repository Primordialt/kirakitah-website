"use client";

import { ApplicationPreflightPanel } from "@/components/features/participant/ApplicationPreflightPanel";
import { Button, Checkbox, Input, Select } from "@/components/ui";
import { COMPETITION_NAME } from "@/config/competition";
import {
  registrationAvailabilityOptions,
  registrationPlatforms,
  registrationTimezones,
} from "@/config/esports";
import { followKirakitahCopy } from "@/config/eligibility-requirements";
import { REQUIRED_SOCIAL_ACCOUNTS } from "@/config/social";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import type { ApplicationPreflight } from "@/server/participant/application-preflight";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const STEPS = [
  { id: "info", label: "Application", title: "Application information" },
  { id: "efootball", label: "eFootball", title: "eFootball account" },
  { id: "socials", label: "Socials", title: "Social requirements" },
  { id: "review", label: "Review", title: "Application review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export type TournamentApplyFormProps = {
  tournamentId: string;
  preflight: ApplicationPreflight;
};

export function TournamentApplyForm({
  tournamentId,
  preflight,
}: TournamentApplyFormProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepStatusId = useId();

  const [phase, setPhase] = useState<"preflight" | "wizard" | "success">(
    "preflight",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [platform, setPlatform] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [availability, setAvailability] = useState<string[]>([]);
  const [gamingProfile, setGamingProfile] = useState("");
  const [efootballConfirmed, setEfootballConfirmed] = useState(false);
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({
    x: "",
    instagram: "",
    tiktok: "",
  });
  const [socialFollowAttestation, setSocialFollowAttestation] = useState(false);
  const [consents, setConsents] = useState({
    rules: false,
    terms: false,
    privacy: false,
    codeOfConduct: false,
    mediaConsent: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [gateCode, setGateCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const step = STEPS[stepIndex]!;
  const profile = preflight.profile;

  useEffect(() => {
    if (phase !== "wizard") return;
    headingRef.current?.focus();
  }, [phase, stepIndex]);

  const toggleAvailability = (value: string, checked: boolean) => {
    setAvailability((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return Array.from(next);
    });
  };

  const goToStep = (index: number) => {
    setError(null);
    setGateCode(null);
    setStepIndex(index);
  };

  const validateStep = (id: StepId): string | null => {
    if (id === "info") {
      if (!platform) return "Select your mobile platform.";
      if (!timezone) return "Select your time zone.";
      if (availability.length === 0) {
        return "Select at least one availability option.";
      }
      return null;
    }
    if (id === "efootball") {
      if (!profile?.gamerTag?.trim()) {
        return "Your verified profile is missing an eFootball username.";
      }
      if (!efootballConfirmed) {
        return "Confirm the eFootball account you will use for this tournament.";
      }
      return null;
    }
    if (id === "socials") {
      for (const account of REQUIRED_SOCIAL_ACCOUNTS) {
        if (!socialHandles[account.platform]?.trim()) {
          return `Enter your ${account.label} username.`;
        }
      }
      if (!socialFollowAttestation) {
        return "Confirm that you follow KIRAKITAH on the required platforms.";
      }
      return null;
    }
    return null;
  };

  const onNext = () => {
    const validationError = validateStep(step.id);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const onBack = () => {
    setError(null);
    setGateCode(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    setGateCode(null);

    for (const candidate of STEPS) {
      if (candidate.id === "review") continue;
      const validationError = validateStep(candidate.id);
      if (validationError) {
        setLoading(false);
        setError(validationError);
        setStepIndex(STEPS.findIndex((item) => item.id === candidate.id));
        return;
      }
    }

    if (
      !consents.rules ||
      !consents.terms ||
      !consents.privacy ||
      !consents.codeOfConduct ||
      !consents.mediaConsent
    ) {
      setLoading(false);
      setError("Accept all required consents to continue.");
      return;
    }

    const { response, payload } = await participantFetch<{
      referenceId?: string;
      status?: string;
    }>(`/api/participant/tournaments/${tournamentId}/apply`, {
      method: "POST",
      body: JSON.stringify({
        game: "eFootball Mobile",
        platform,
        gamingProfile: gamingProfile.trim() || undefined,
        timezone,
        availability,
        socialHandles,
        socialFollowAttestation: true,
        consents: {
          rules: true,
          terms: true,
          privacy: true,
          codeOfConduct: true,
          mediaConsent: true,
        },
      }),
    });

    setLoading(false);

    if (!response.ok || !payload.referenceId) {
      const code = payload.error?.code ?? null;
      setGateCode(code);
      setError(
        apiErrorMessage(payload, "Unable to submit tournament application."),
      );
      return;
    }

    setReferenceId(payload.referenceId);
    setSubmittedAt(new Date().toISOString());
    setPhase("success");
  };

  if (!preflight.canContinue || phase === "preflight") {
    return (
      <ApplicationPreflightPanel
        preflight={preflight}
        tournamentId={tournamentId}
        onContinue={
          preflight.canContinue ? () => setPhase("wizard") : undefined
        }
      />
    );
  }

  if (phase === "success" && referenceId) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
            {COMPETITION_NAME}
          </p>
          <h1 className="text-h2 text-text-primary">Application received</h1>
        </header>
        <dl className="space-y-3 text-body-sm">
          <div>
            <dt className="text-text-muted">Application reference</dt>
            <dd className="font-medium text-text-primary">{referenceId}</dd>
          </div>
          {submittedAt ? (
            <div>
              <dt className="text-text-muted">Submitted</dt>
              <dd className="text-text-primary">
                {new Date(submittedAt).toLocaleString()}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-text-muted">Status</dt>
            <dd className="font-medium text-text-primary">APPLICATION RECEIVED</dd>
          </div>
        </dl>
        <div className="space-y-3 text-body text-text-secondary">
          <p>
            Your application has been received and will go through the required
            review and eligibility process.
          </p>
          <p className="font-medium text-text-primary">
            Application submission does not guarantee participation.
          </p>
          <p>
            Eligibility, selection, and qualification are separate steps that
            happen after your application is reviewed.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href={`/tournaments/${tournamentId}`}>View application</Button>
          <Button href="/dashboard" variant="secondary">
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const platformLabel =
    registrationPlatforms.find((item) => item.value === platform)?.label ??
    platform;
  const availabilityLabels = registrationAvailabilityOptions
    .filter((item) => availability.includes(item.value))
    .map((item) => item.label);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
          {COMPETITION_NAME}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-h2 text-text-primary outline-none"
        >
          {step.title}
        </h1>
        <p id={stepStatusId} className="text-body-sm text-text-secondary" aria-live="polite">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
      </header>

      <nav aria-label="Application progress" className="mt-6">
        <ol className="hidden gap-2 md:grid md:grid-cols-4">
          {STEPS.map((item, index) => {
            const current = index === stepIndex;
            const complete = index < stepIndex;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                    current
                      ? "border-brand-primary bg-brand-primary/10"
                      : "border-border bg-surface"
                  }`}
                  aria-current={current ? "step" : undefined}
                  onClick={() => {
                    if (index <= stepIndex) goToStep(index);
                  }}
                  disabled={index > stepIndex}
                >
                  <span className="block text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Step {index + 1}
                    {complete ? " · Done" : current ? " · Current" : ""}
                  </span>
                  <span className="mt-1 block text-body-sm font-medium text-text-primary">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-body-sm font-medium text-text-primary md:hidden">
          {step.title}
        </p>
      </nav>

      <div className="mt-8 space-y-8" aria-describedby={stepStatusId}>
        {step.id === "info" ? (
          <fieldset className="space-y-5">
            <legend className="sr-only">Application information</legend>
            <p className="text-body-sm text-text-secondary">
              Your account email and verified profile details are already on
              file. Enter only the tournament-specific information below.
            </p>
            <Input label="Game" value="eFootball Mobile" readOnly disabled />
            <Select
              label="Mobile platform"
              required
              placeholder="Select platform"
              options={registrationPlatforms}
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            />
            <Select
              label="Time zone"
              required
              options={registrationTimezones}
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
            <div className="space-y-3">
              <p className="text-label text-text-primary">
                Tournament availability <span className="text-error">*</span>
              </p>
              {registrationAvailabilityOptions.map((option) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={availability.includes(option.value)}
                  onChange={(event) =>
                    toggleAvailability(option.value, event.target.checked)
                  }
                />
              ))}
            </div>
            <Input
              label="Additional gaming notes"
              description="Optional team name, preferences, or other gaming details"
              value={gamingProfile}
              onChange={(event) => setGamingProfile(event.target.value)}
            />
          </fieldset>
        ) : null}

        {step.id === "efootball" ? (
          <fieldset className="space-y-5">
            <legend className="sr-only">eFootball account</legend>
            <p className="text-body text-text-secondary">
              Enter the eFootball username you will use for this tournament. This
              value comes from your verified participant profile.
            </p>
            <Input
              label="eFootball username"
              value={profile?.gamerTag ?? ""}
              readOnly
              disabled
            />
            <p className="text-body-sm text-text-secondary">
              This eFootball account can only be used once for this tournament.
            </p>
            <p className="text-body-sm text-text-muted">
              Need to change it? Update your profile before applying. Verified
              profiles may require administrator correction first.
            </p>
            <Checkbox
              label={`I will compete using eFootball username ${profile?.gamerTag ?? ""}`}
              required
              checked={efootballConfirmed}
              onChange={(event) => setEfootballConfirmed(event.target.checked)}
            />
            <Button href="/profile" variant="secondary">
              View profile
            </Button>
          </fieldset>
        ) : null}

        {step.id === "socials" ? (
          <fieldset className="space-y-5">
            <legend className="text-h4 text-text-primary">
              {followKirakitahCopy.legend}
            </legend>
            <p className="text-body-sm text-text-secondary">
              {followKirakitahCopy.supporting}
            </p>
            <p className="text-body-sm text-text-muted">
              Your follows will be manually reviewed before participation.
            </p>
            <ul className="space-y-3">
              {REQUIRED_SOCIAL_ACCOUNTS.map((account) => (
                <li key={account.platform}>
                  <a
                    href={account.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-body-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    Follow on {account.label}
                  </a>
                </li>
              ))}
            </ul>
            {REQUIRED_SOCIAL_ACCOUNTS.map((account) => (
              <Input
                key={account.platform}
                label={account.handleFieldLabel}
                required
                placeholder={account.handlePlaceholder}
                value={socialHandles[account.platform] ?? ""}
                onChange={(event) =>
                  setSocialHandles((prev) => ({
                    ...prev,
                    [account.platform]: event.target.value,
                  }))
                }
              />
            ))}
            <Checkbox
              label={followKirakitahCopy.attestationLabel}
              description={followKirakitahCopy.attestationDescription}
              required
              checked={socialFollowAttestation}
              onChange={(event) =>
                setSocialFollowAttestation(event.target.checked)
              }
            />
          </fieldset>
        ) : null}

        {step.id === "review" ? (
          <div className="space-y-8">
            <section aria-labelledby="review-account-heading" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="review-account-heading" className="text-h4 text-text-primary">
                  Account
                </h2>
              </div>
              <dl className="space-y-2 text-body-sm">
                <div>
                  <dt className="text-text-muted">Email</dt>
                  <dd className="text-text-primary">{profile?.emailMasked}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Profile</dt>
                  <dd className="text-text-primary">
                    {profile?.firstName} {profile?.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Verification</dt>
                  <dd className="font-medium text-text-primary">VERIFIED</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Identity verification</dt>
                  <dd className="text-text-secondary">
                    Submitted with your verified profile for manual review
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="review-info-heading" className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="review-info-heading" className="text-h4 text-text-primary">
                  Application information
                </h2>
                <Button type="button" variant="ghost" onClick={() => goToStep(0)}>
                  Edit
                </Button>
              </div>
              <dl className="space-y-2 text-body-sm">
                <div>
                  <dt className="text-text-muted">Platform</dt>
                  <dd className="text-text-primary">{platformLabel}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Time zone</dt>
                  <dd className="text-text-primary">{timezone}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Availability</dt>
                  <dd className="text-text-primary">
                    {availabilityLabels.join(", ") || "—"}
                  </dd>
                </div>
                {gamingProfile.trim() ? (
                  <div>
                    <dt className="text-text-muted">Notes</dt>
                    <dd className="text-text-primary">{gamingProfile.trim()}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section aria-labelledby="review-efootball-heading" className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="review-efootball-heading" className="text-h4 text-text-primary">
                  eFootball account
                </h2>
                <Button type="button" variant="ghost" onClick={() => goToStep(1)}>
                  Edit
                </Button>
              </div>
              <p className="text-body-sm text-text-primary">{profile?.gamerTag}</p>
            </section>

            <section aria-labelledby="review-socials-heading" className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="review-socials-heading" className="text-h4 text-text-primary">
                  Social requirements
                </h2>
                <Button type="button" variant="ghost" onClick={() => goToStep(2)}>
                  Edit
                </Button>
              </div>
              <ul className="space-y-2 text-body-sm text-text-secondary">
                {REQUIRED_SOCIAL_ACCOUNTS.map((account) => (
                  <li key={account.platform}>
                    {account.label}: Confirmed follow attestation · @
                    {socialHandles[account.platform]}
                  </li>
                ))}
              </ul>
              <p className="text-body-sm text-text-muted">
                Follows are manually reviewed. This is not automatic verification.
              </p>
            </section>

            <section aria-labelledby="submit-heading" className="space-y-4 border-t border-border pt-6">
              <h2 id="submit-heading" className="text-h4 text-text-primary">
                Submit application
              </h2>
              <p className="text-body-sm text-text-secondary">
                By submitting this application, you confirm that the information
                provided is accurate. Your application will be reviewed after
                submission.
              </p>
              <fieldset className="space-y-4">
                <legend className="sr-only">Required consents</legend>
                <Checkbox
                  label={
                    <>
                      I have read and accept the{" "}
                      <Link href="/esports/rules" className="text-accent underline">
                        tournament rules
                      </Link>
                    </>
                  }
                  required
                  checked={consents.rules}
                  onChange={(event) =>
                    setConsents((prev) => ({ ...prev, rules: event.target.checked }))
                  }
                />
                <Checkbox
                  label={
                    <>
                      I accept the{" "}
                      <Link href="/terms" className="text-accent underline">
                        terms and conditions
                      </Link>
                    </>
                  }
                  required
                  checked={consents.terms}
                  onChange={(event) =>
                    setConsents((prev) => ({ ...prev, terms: event.target.checked }))
                  }
                />
                <Checkbox
                  label={
                    <>
                      I accept the{" "}
                      <Link href="/privacy" className="text-accent underline">
                        privacy policy
                      </Link>
                    </>
                  }
                  required
                  checked={consents.privacy}
                  onChange={(event) =>
                    setConsents((prev) => ({
                      ...prev,
                      privacy: event.target.checked,
                    }))
                  }
                />
                <Checkbox
                  label={
                    <>
                      I agree to the{" "}
                      <Link href="/code-of-conduct" className="text-accent underline">
                        code of conduct
                      </Link>
                    </>
                  }
                  required
                  checked={consents.codeOfConduct}
                  onChange={(event) =>
                    setConsents((prev) => ({
                      ...prev,
                      codeOfConduct: event.target.checked,
                    }))
                  }
                />
                <Checkbox
                  label="I consent to media coverage of tournament participation"
                  required
                  checked={consents.mediaConsent}
                  onChange={(event) =>
                    setConsents((prev) => ({
                      ...prev,
                      mediaConsent: event.target.checked,
                    }))
                  }
                />
              </fieldset>
            </section>
          </div>
        ) : null}

        {error ? (
          <div className="space-y-3" role="alert">
            {gateCode === "EFOOTBALL_ACCOUNT_ALREADY_REGISTERED" ? (
              <>
                <h2 className="text-h4 text-text-primary">
                  EFOOTBALL ACCOUNT ALREADY REGISTERED
                </h2>
                <p className="text-body-sm text-text-secondary">
                  This eFootball account is already registered for this tournament.
                </p>
                <Button href={`/tournaments/${tournamentId}`} variant="secondary">
                  Back to tournament
                </Button>
              </>
            ) : gateCode === "DUPLICATE_APPLICATION" ? (
              <>
                <h2 className="text-h4 text-text-primary">
                  APPLICATION ALREADY SUBMITTED
                </h2>
                <p className="text-body-sm text-text-secondary">{error}</p>
                <Button href={`/tournaments/${tournamentId}`}>
                  View application
                </Button>
              </>
            ) : (
              <>
                <p className="text-body-sm text-error">{error}</p>
                {gateCode === "PROFILE_INCOMPLETE" ||
                gateCode === "PROFILE_REQUIRES_CORRECTION" ||
                gateCode === "PROFILE_NOT_VERIFIED" ? (
                  <Button href="/profile" variant="secondary">
                    Go to profile
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          {stepIndex > 0 ? (
            <Button type="button" variant="secondary" onClick={onBack}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setPhase("preflight")}>
              Back to check
            </Button>
          )}
          {step.id !== "review" ? (
            <Button type="button" onClick={onNext}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              loading={loading}
              onClick={() => void onSubmit()}
            >
              Submit application
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/tournaments/${tournamentId}`)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
