"use client";

import { Button, Checkbox, FileInput, Input, Select } from "@/components/ui";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { COMPETITION_NAME } from "@/config/competition";
import { registrationCountries } from "@/config/esports";
import { requiresGuardian } from "@/domain/registration";
import {
  IDENTIFICATION_TYPE_OPTIONS,
  getIdentificationNumberLabel,
  getIdentificationNumberPlaceholder,
  type IdentificationType,
} from "@/lib/identification";
import {
  MAX_IDENTITY_FILE_SIZE_BYTES,
  PLAYER_PHOTO_ACCEPTED_TYPES,
  formatAcceptedTypes,
  formatFileSize,
  validateIdentityFile,
} from "@/lib/identity-upload";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import {
  getProfileStatusLabel,
  type ParticipantProfileStatus,
} from "@/lib/participant/dashboard-status";
import {
  formatMissingFieldLabel,
  getProfilePresentation,
  getProfileTimeline,
} from "@/lib/participant/profile-presentation";
import { useEffect, useMemo, useState } from "react";

type CompletionSection = {
  id: string;
  label: string;
  complete: boolean;
  missingFields: string[];
};

type ProfilePayload = {
  id: string;
  status: ParticipantProfileStatus;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  identificationType: IdentificationType | null;
  governmentIdType: string | null;
  hasIdentificationNumber: boolean;
  gamerTag: string | null;
  hasPlayerPhoto: boolean;
  guardian: {
    fullName: string;
    relationship: string;
    email: string;
    phone: string;
  } | null;
  completionPercent: number;
  missingFields: string[];
  completionSections?: CompletionSection[];
  submittedAt: string | null;
  verifiedAt: string | null;
  correctionReason: string | null;
};

const emptyGuardian = {
  fullName: "",
  relationship: "",
  email: "",
  phone: "",
  consent: false,
};

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [identificationType, setIdentificationType] = useState<
    IdentificationType | ""
  >("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [governmentIdType, setGovernmentIdType] = useState("");
  const [gamerTag, setGamerTag] = useState("");
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [guardian, setGuardian] = useState(emptyGuardian);

  const readOnly = profile?.status === "submitted_for_review";
  const efootballLocked = profile?.status === "verified";

  const showGuardian = useMemo(
    () => Boolean(dateOfBirth && requiresGuardian(dateOfBirth)),
    [dateOfBirth],
  );

  const applyProfile = (next: ProfilePayload) => {
    setProfile(next);
    setFirstName(next.firstName ?? "");
    setLastName(next.lastName ?? "");
    setDateOfBirth(next.dateOfBirth ?? "");
    setCountry(next.country ?? "");
    setCity(next.city ?? "");
    setPhone(next.phone ?? "");
    setIdentificationType(next.identificationType ?? "");
    setGovernmentIdType(next.governmentIdType ?? "");
    setIdentificationNumber("");
    setGamerTag(next.gamerTag ?? "");
    setPlayerPhoto(null);
    setGuardian(
      next.guardian
        ? {
            fullName: next.guardian.fullName,
            relationship: next.guardian.relationship,
            email: next.guardian.email,
            phone: next.guardian.phone,
            consent: true,
          }
        : emptyGuardian,
    );
  };

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    const { response, payload } = await participantFetch<{
      profile?: ProfilePayload;
    }>("/api/participant/profile");
    setLoading(false);

    if (!response.ok || !payload.profile) {
      setError(apiErrorMessage(payload, "Unable to load profile."));
      return;
    }

    applyProfile(payload.profile);
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly || !profile) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("firstName", firstName.trim());
    formData.set("lastName", lastName.trim());
    formData.set("dateOfBirth", dateOfBirth);
    formData.set("country", country);
    formData.set("city", city.trim());
    formData.set("phone", phone.trim());
    if (identificationType) {
      formData.set("identificationType", identificationType);
    }
    if (identificationType === "other_government_id") {
      formData.set("governmentIdType", governmentIdType.trim());
    }
    if (identificationNumber.trim()) {
      formData.set("identificationNumber", identificationNumber.trim());
    }
    // Approved eFootball account is immutable — always send the locked value.
    formData.set(
      "gamerTag",
      efootballLocked
        ? (profile.gamerTag?.trim() ?? "")
        : gamerTag.trim(),
    );
    if (playerPhoto) {
      formData.set("playerPhoto", playerPhoto);
    }
    if (showGuardian) {
      if (!guardian.consent) {
        setSaving(false);
        setError("Guardian consent is required for applicants under 18.");
        return;
      }
      formData.set(
        "guardian",
        JSON.stringify({
          fullName: guardian.fullName.trim(),
          relationship: guardian.relationship.trim(),
          email: guardian.email.trim(),
          phone: guardian.phone.trim(),
        }),
      );
    } else {
      formData.set("guardian", "null");
    }

    const { response, payload } = await participantFetch<{
      profile?: ProfilePayload;
    }>("/api/participant/profile", {
      method: "PUT",
      body: formData,
    });

    setSaving(false);

    if (!response.ok || !payload.profile) {
      setError(apiErrorMessage(payload, "Unable to save profile."));
      return;
    }

    applyProfile(payload.profile);
    setMessage(
      "Profile saved. Saving does not submit your profile for verification.",
    );
  };

  const onSubmitForReview = async () => {
    if (!profile) return;

    const missingAtSubmit = profile.missingFields;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { response, payload } = await participantFetch<{
      profile?: ProfilePayload;
    }>("/api/participant/profile/submit", { method: "POST" });

    setSubmitting(false);

    if (!response.ok || !payload.profile) {
      if (missingAtSubmit.length > 0) {
        setError(
          `Complete the highlighted sections before submitting your profile: ${missingAtSubmit
            .map(formatMissingFieldLabel)
            .join(", ")}.`,
        );
      } else {
        setError(
          apiErrorMessage(payload, "Unable to submit profile for review."),
        );
      }
      return;
    }

    applyProfile(payload.profile);
    setMessage("Profile submitted for administrator verification.");
  };

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading profile…
      </p>
    );
  }

  if (!profile) {
    return (
      <p role="alert" className="text-body-sm text-error">
        {error ?? "Unable to load profile."}
      </p>
    );
  }

  const presentation = getProfilePresentation(
    profile.status,
    profile.completionPercent,
    profile.correctionReason,
  );
  const canSubmitForReview =
    profile.completionPercent === 100 &&
    (profile.status === "incomplete" || profile.status === "needs_correction");
  const sections = profile.completionSections ?? [];
  const timeline = getProfileTimeline({
    status: profile.status,
    submittedAt: profile.submittedAt,
    verifiedAt: profile.verifiedAt,
    correctionReason: profile.correctionReason,
  });
  const clamped = Math.max(0, Math.min(100, profile.completionPercent));
  const idLabel = identificationType
    ? getIdentificationNumberLabel(identificationType)
    : "Identification number";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header>
        <h1 className="flex flex-wrap items-center gap-2 text-h2 text-text-primary">
          Profile
          <VerifiedBadge verified={profile.status === "verified"} size="md" />
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Profile information is reviewed by administrators. It is separate from
          your account login and from tournament applications.
        </p>
      </header>

      <section
        aria-labelledby="profile-overview-heading"
        className="space-y-4 border-t border-border pt-6"
      >
        <h2 id="profile-overview-heading" className="text-h4 text-text-primary">
          Profile overview
        </h2>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-body-sm font-medium text-text-primary">
            Completion
          </p>
          <p className="text-body-sm text-text-secondary">{clamped}%</p>
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
            className="h-full rounded-full bg-brand-primary"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <dl className="mt-4 space-y-2">
          <div>
            <dt className="text-caption uppercase tracking-wide text-text-muted">
              Verification
            </dt>
            <dd className="text-body font-semibold text-text-primary">
              {presentation.verificationLabel} ·{" "}
              {getProfileStatusLabel(profile.status)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-body-sm text-text-secondary">
          {presentation.description}
        </p>
        {profile.status === "needs_correction" && profile.correctionReason ? (
          <p className="mt-3 text-body-sm text-error" role="status">
            Update required: {profile.correctionReason}
          </p>
        ) : null}
        {profile.status === "verified" ? (
          <p className="mt-3 text-body-sm font-medium text-success" role="status">
            PROFILE VERIFIED ✓
          </p>
        ) : null}
      </section>

      {sections.length > 0 ? (
        <section
          aria-labelledby="completion-breakdown-heading"
          className="rounded-xl border border-border bg-surface p-5"
        >
          <h2
            id="completion-breakdown-heading"
            className="text-h4 text-text-primary"
          >
            PROFILE COMPLETION
          </h2>
          <ul className="mt-4 space-y-3">
            {sections.map((section) => (
              <li
                key={section.id}
                className="flex items-start justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0"
              >
                <div>
                  <p className="text-body-sm font-medium text-text-primary">
                    {section.label}
                  </p>
                  {!section.complete && section.missingFields.length > 0 ? (
                    <p className="mt-1 text-caption text-text-muted">
                      Missing:{" "}
                      {section.missingFields
                        .map(formatMissingFieldLabel)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <p
                  className={`text-body-sm font-semibold ${
                    section.complete ? "text-success" : "text-text-muted"
                  }`}
                >
                  {section.complete ? "Complete" : "Incomplete"}
                  <span aria-hidden="true"> {section.complete ? "✓" : "○"}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {timeline.length > 1 ? (
        <section
          aria-labelledby="profile-timeline-heading"
          className="rounded-xl border border-border bg-surface p-5"
        >
          <h2 id="profile-timeline-heading" className="text-h4 text-text-primary">
            STATUS
          </h2>
          <ol className="mt-4 space-y-3">
            {timeline.map((step) => (
              <li key={step.id} className="text-body-sm">
                <p
                  className={
                    step.current
                      ? "font-semibold text-text-primary"
                      : "text-text-secondary"
                  }
                >
                  {step.label}
                  {step.current ? " (current)" : ""}
                </p>
                {step.detail ? (
                  <p className="mt-1 text-caption text-text-muted">{step.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <form
        className="space-y-8"
        onSubmit={(event) => void onSave(event)}
        noValidate
      >
        <fieldset className="space-y-5" disabled={readOnly}>
          <legend className="text-h4 text-text-primary">Personal information</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="First name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <Input
              label="Last name"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <Input
            label="Date of birth"
            type="date"
            required
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
          />
          <Select
            label="Country"
            required
            placeholder="Select country"
            options={registrationCountries}
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          />
          <Input
            label="City"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </fieldset>

        <fieldset className="space-y-5" disabled={readOnly}>
          <legend className="text-h4 text-text-primary">Contact information</legend>
          <Input
            label="Phone"
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </fieldset>

        <fieldset className="space-y-5" disabled={readOnly}>
          <legend className="text-h4 text-text-primary">Gaming information</legend>
          {efootballLocked ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                  EFootball account
                </p>
                <VerifiedBadge verified size="sm" />
                <span className="text-body-sm font-medium text-text-primary">
                  Verified
                </span>
              </div>
              <Input
                label="Your eFootball username"
                value={profile.gamerTag ?? ""}
                readOnly
                aria-readonly="true"
                description={`Your approved eFootball account is locked for ${COMPETITION_NAME}.`}
              />
              <p className="text-body-sm text-text-secondary" role="status">
                Your approved eFootball account is locked for {COMPETITION_NAME}{" "}
                and cannot be changed.
              </p>
            </div>
          ) : (
            <Input
              label="Your eFootball username"
              required
              value={gamerTag}
              onChange={(event) => setGamerTag(event.target.value)}
              description="This is your eFootball Gamer Tag, not your account username."
            />
          )}
        </fieldset>

        <fieldset className="space-y-5" disabled={readOnly}>
          <legend className="text-h4 text-text-primary">Identity information</legend>
          <p className="text-body-sm text-text-secondary">
            Identification numbers are stored securely. After submission they are
            shown as on file rather than re-displayed in full.
          </p>
          <div className="space-y-3">
            <p id="identification-type-label" className="text-label text-text-primary">
              Identification type <span className="text-error">*</span>
            </p>
            <div
              role="radiogroup"
              aria-labelledby="identification-type-label"
              className="space-y-2"
            >
              {IDENTIFICATION_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-body-sm"
                >
                  <input
                    type="radio"
                    name="identificationType"
                    value={option.value}
                    checked={identificationType === option.value}
                    onChange={() => {
                      setIdentificationType(option.value);
                      setIdentificationNumber("");
                      if (option.value !== "other_government_id") {
                        setGovernmentIdType("");
                      }
                    }}
                    className="size-4 shrink-0 accent-brand-primary"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          {identificationType === "other_government_id" ? (
            <Input
              label="Government ID type"
              required
              value={governmentIdType}
              onChange={(event) => setGovernmentIdType(event.target.value)}
              placeholder="e.g. Driver's Licence, Permanent Voter's Card"
              autoComplete="off"
            />
          ) : null}
          {readOnly || profile.hasIdentificationNumber ? (
            <p className="rounded-lg border border-border bg-surface-muted px-3 py-3 text-body-sm text-text-secondary">
              Identification number:{" "}
              <span className="font-medium text-text-primary">
                {profile.hasIdentificationNumber
                  ? "On file"
                  : "Not provided"}
              </span>
              {!readOnly && profile.hasIdentificationNumber
                ? " — enter a new value below only if you need to replace it."
                : null}
            </p>
          ) : null}
          {!readOnly ? (
            <Input
              label={idLabel}
              required={!profile.hasIdentificationNumber}
              disabled={!identificationType}
              placeholder={
                identificationType
                  ? getIdentificationNumberPlaceholder(identificationType)
                  : "Select an identification type first"
              }
              description={
                profile.hasIdentificationNumber
                  ? "Leave blank to keep your existing identification number on file."
                  : undefined
              }
              value={identificationNumber}
              onChange={(event) => setIdentificationNumber(event.target.value)}
              autoComplete="off"
            />
          ) : null}
        </fieldset>

        <fieldset className="space-y-5" disabled={readOnly}>
          <legend className="text-h4 text-text-primary">Required documents</legend>
          <FileInput
            label="Player photo"
            required={!profile.hasPlayerPhoto}
            accept={PLAYER_PHOTO_ACCEPTED_TYPES.join(",")}
            description={`Accepted: ${formatAcceptedTypes(PLAYER_PHOTO_ACCEPTED_TYPES)}. Max ${formatFileSize(MAX_IDENTITY_FILE_SIZE_BYTES)}.${profile.hasPlayerPhoto ? " Current photo is on file — leave empty to keep it." : ""}`}
            selectedFile={playerPhoto}
            error={photoError}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setPlayerPhoto(null);
                setPhotoError(undefined);
                return;
              }
              const validationError = validateIdentityFile(file, {
                label: "Player photo",
                acceptedTypes: PLAYER_PHOTO_ACCEPTED_TYPES,
                maxSizeBytes: MAX_IDENTITY_FILE_SIZE_BYTES,
              });
              if (validationError) {
                setPlayerPhoto(null);
                setPhotoError(validationError);
                event.target.value = "";
                return;
              }
              setPhotoError(undefined);
              setPlayerPhoto(file);
            }}
          />
        </fieldset>

        {showGuardian ? (
          <fieldset
            className="space-y-5 rounded-xl border border-border p-5"
            disabled={readOnly}
          >
            <legend className="text-h4 text-text-primary">
              Parent / guardian
            </legend>
            <Input
              label="Guardian full name"
              required
              value={guardian.fullName}
              onChange={(event) =>
                setGuardian((prev) => ({ ...prev, fullName: event.target.value }))
              }
            />
            <Input
              label="Relationship"
              required
              value={guardian.relationship}
              onChange={(event) =>
                setGuardian((prev) => ({
                  ...prev,
                  relationship: event.target.value,
                }))
              }
            />
            <Input
              label="Guardian email"
              type="email"
              required
              value={guardian.email}
              onChange={(event) =>
                setGuardian((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <Input
              label="Guardian phone"
              type="tel"
              required
              value={guardian.phone}
              onChange={(event) =>
                setGuardian((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
            <Checkbox
              label="I confirm I am the parent or guardian and consent to this profile"
              required
              checked={guardian.consent}
              onChange={(event) =>
                setGuardian((prev) => ({
                  ...prev,
                  consent: event.target.checked,
                }))
              }
            />
          </fieldset>
        ) : null}

        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-body-sm text-text-secondary">
            {message}
          </p>
        ) : null}

        {!readOnly ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="submit" loading={saving} variant="secondary">
              SAVE PROFILE
            </Button>
            {canSubmitForReview ? (
              <Button
                type="button"
                loading={submitting}
                onClick={() => void onSubmitForReview()}
              >
                SUBMIT FOR VERIFICATION
              </Button>
            ) : (
              <p className="self-center text-body-sm text-text-muted">
                Complete all required sections before submitting for
                verification.
              </p>
            )}
          </div>
        ) : null}

        {!readOnly ? (
          <p className="text-caption text-text-muted">
            Save keeps your progress. Submit for verification sends a complete
            profile to administrators for review.
          </p>
        ) : null}
      </form>

      {profile.status === "verified" ? (
        <div>
          <Button href="/tournaments">EXPLORE TOURNAMENTS</Button>
        </div>
      ) : null}

      <p>
        <Button href="/dashboard" variant="ghost">
          Back to dashboard
        </Button>
      </p>
    </div>
  );
}
