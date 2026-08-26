"use client";

import { Button, Checkbox, FileInput, Input, Select } from "@/components/ui";
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
import { useEffect, useMemo, useState } from "react";

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
  const [gamerTag, setGamerTag] = useState("");
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [guardian, setGuardian] = useState(emptyGuardian);

  const readOnly =
    profile?.status === "submitted_for_review" ||
    profile?.status === "verified";

  const showGuardian = useMemo(
    () => Boolean(dateOfBirth && requiresGuardian(dateOfBirth)),
    [dateOfBirth],
  );

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

    const next = payload.profile;
    setProfile(next);
    setFirstName(next.firstName ?? "");
    setLastName(next.lastName ?? "");
    setDateOfBirth(next.dateOfBirth ?? "");
    setCountry(next.country ?? "");
    setCity(next.city ?? "");
    setPhone(next.phone ?? "");
    setIdentificationType(next.identificationType ?? "");
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
    if (identificationNumber.trim()) {
      formData.set("identificationNumber", identificationNumber.trim());
    }
    formData.set("gamerTag", gamerTag.trim());
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

    setProfile(payload.profile);
    setMessage("Profile saved.");
    setPlayerPhoto(null);
    setIdentificationNumber("");
  };

  const onSubmitForReview = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { response, payload } = await participantFetch<{
      profile?: ProfilePayload;
    }>("/api/participant/profile/submit", { method: "POST" });

    setSubmitting(false);

    if (!response.ok || !payload.profile) {
      setError(apiErrorMessage(payload, "Unable to submit profile for review."));
      return;
    }

    setProfile(payload.profile);
    setMessage("Profile submitted for review.");
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

  const canSubmitForReview =
    profile.completionPercent === 100 &&
    (profile.status === "incomplete" || profile.status === "needs_correction");

  const idLabel = identificationType
    ? getIdentificationNumberLabel(identificationType)
    : "Identification number";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-h2 text-text-primary">YOUR PROFILE</h1>
      <p className="mt-2 text-body text-text-secondary">
        PROFILE {profile.completionPercent}% COMPLETE ·{" "}
        {getProfileStatusLabel(profile.status)}
      </p>

      {profile.status === "needs_correction" && profile.correctionReason ? (
        <p className="mt-4 text-body-sm text-error" role="status">
          Update required: {profile.correctionReason}
        </p>
      ) : null}
      {profile.status === "submitted_for_review" ? (
        <p className="mt-4 text-body-sm text-text-secondary" role="status">
          Your profile is under review and cannot be edited right now.
        </p>
      ) : null}
      {profile.status === "verified" ? (
        <p className="mt-4 text-body-sm text-text-secondary" role="status">
          Your profile is verified. Contact support if you need changes.
        </p>
      ) : null}

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => void onSave(event)}
        noValidate
      >
        <fieldset className="space-y-5" disabled={readOnly}>
          <legend className="sr-only">Profile details</legend>
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
          <Input
            label="Phone"
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Select
            label="Identification type"
            required
            placeholder="Select identification type"
            options={[...IDENTIFICATION_TYPE_OPTIONS]}
            value={identificationType}
            onChange={(event) =>
              setIdentificationType(event.target.value as IdentificationType | "")
            }
          />
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
          <Input
            label="Your eFootball username"
            required
            value={gamerTag}
            onChange={(event) => setGamerTag(event.target.value)}
            description="This is your eFootball Gamer Tag, not your account username."
          />
          <FileInput
            label="Player photo"
            required={!profile.hasPlayerPhoto}
            accept={PLAYER_PHOTO_ACCEPTED_TYPES.join(",")}
            description={`Accepted: ${formatAcceptedTypes(PLAYER_PHOTO_ACCEPTED_TYPES)}. Max ${formatFileSize(MAX_IDENTITY_FILE_SIZE_BYTES)}.${profile.hasPlayerPhoto ? " Leave empty to keep your current photo." : ""}`}
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
          <fieldset className="space-y-5 rounded-xl border border-border p-5" disabled={readOnly}>
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
          <Button type="submit" loading={saving}>
            SAVE PROFILE
          </Button>
        ) : null}
      </form>

      {canSubmitForReview ? (
        <div className="mt-6">
          <Button
            type="button"
            loading={submitting}
            onClick={() => void onSubmitForReview()}
          >
            SUBMIT PROFILE FOR REVIEW
          </Button>
        </div>
      ) : null}

      <p className="mt-8">
        <Button href="/dashboard" variant="ghost">
          Back to dashboard
        </Button>
      </p>
    </div>
  );
}
