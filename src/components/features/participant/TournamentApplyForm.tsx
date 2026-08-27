"use client";

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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TournamentApplyForm({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [platform, setPlatform] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [availability, setAvailability] = useState<string[]>([]);
  const [gamingProfile, setGamingProfile] = useState("");
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

  const toggleAvailability = (value: string, checked: boolean) => {
    setAvailability((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return Array.from(next);
    });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setGateCode(null);

    if (!socialFollowAttestation) {
      setLoading(false);
      setError("Confirm that you follow KIRAKITAH on the required platforms.");
      return;
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

    if (availability.length === 0) {
      setLoading(false);
      setError("Select at least one availability option.");
      return;
    }

    const { response, payload } = await participantFetch<{
      referenceId?: string;
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
  };

  if (referenceId) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="text-h2 text-text-primary">APPLICATION RECEIVED</h1>
        <p className="text-body text-text-secondary">
          Your application for {COMPETITION_NAME} was submitted.
        </p>
        <p className="text-body-sm text-text-muted">
          Reference ID: <span className="font-medium text-text-primary">{referenceId}</span>
        </p>
        <Button href="/dashboard">Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-h2 text-text-primary">APPLY — {COMPETITION_NAME}</h1>
      <p className="mt-3 text-body text-text-secondary">
        Your verified profile details will be used for this application. Complete
        the tournament-specific fields below.
      </p>

      <form
        className="mt-8 space-y-8"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        <fieldset className="space-y-5">
          <legend className="text-h4 text-text-primary">GAMING</legend>
          <Input label="Game" value="eFootball Mobile" readOnly disabled />
          <Select
            label="Mobile platform"
            required
            placeholder="Select platform"
            options={registrationPlatforms}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          />
          <Input
            label="eFootball information"
            description="Optional team name, preferences, or other gaming details"
            value={gamingProfile}
            onChange={(event) => setGamingProfile(event.target.value)}
          />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="text-h4 text-text-primary">AVAILABILITY</legend>
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
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="text-h4 text-text-primary">
            {followKirakitahCopy.legend}
          </legend>
          <p className="text-body-sm text-text-secondary">
            {followKirakitahCopy.supporting}
          </p>
          <ul className="space-y-2 text-body-sm">
            {REQUIRED_SOCIAL_ACCOUNTS.map((account) => (
              <li key={account.platform}>
                <span className="font-medium text-text-primary">
                  {account.label}:{" "}
                </span>
                <a
                  href={account.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {account.href.replace(/^https?:\/\//, "")}
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

        <fieldset className="space-y-4">
          <legend className="text-h4 text-text-primary">CONSENT</legend>
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
                {gateCode === "DUPLICATE_APPLICATION" ? (
                  <Button href="/dashboard" variant="secondary">
                    Back to dashboard
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={loading}>
            SUBMIT APPLICATION
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
