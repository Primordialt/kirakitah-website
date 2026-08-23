"use client";

import { FileInput } from "@/components/ui/file-input";
import {
  GOVERNMENT_ID_ACCEPTED_TYPES,
  PLAYER_PHOTO_ACCEPTED_TYPES,
  formatAcceptedTypes,
} from "@/lib/identity-upload";
import { Controller } from "react-hook-form";
import type { FormSectionProps } from "./types";

export function IdentityVerification({ control, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">IDENTITY VERIFICATION</legend>
      <p className="text-body-sm text-text-muted">
        Documents are collected for eligibility verification and tournament
        administration only. File contents are not stored in this preview
        environment.
      </p>

      <Controller
        name="identityVerification.governmentId"
        control={control}
        render={({ field: { onChange, onBlur, ref, name, value } }) => (
          <FileInput
            ref={ref}
            name={name}
            label="Government-issued ID"
            required
            accept={GOVERNMENT_ID_ACCEPTED_TYPES.join(",")}
            description={`Upload a clear copy of your government-issued identification document for eligibility verification. Accepted formats: ${formatAcceptedTypes(GOVERNMENT_ID_ACCEPTED_TYPES)}.`}
            selectedFile={value instanceof File ? value : null}
            error={errors.identityVerification?.governmentId?.message}
            onBlur={onBlur}
            onChange={(event) => {
              const file = event.target.files?.[0];
              onChange(file ?? undefined);
            }}
          />
        )}
      />

      <Controller
        name="identityVerification.playerPhoto"
        control={control}
        render={({ field: { onChange, onBlur, ref, name, value } }) => (
          <FileInput
            ref={ref}
            name={name}
            label="Player photo"
            required
            accept={PLAYER_PHOTO_ACCEPTED_TYPES.join(",")}
            description="Upload a recent clear photo of yourself. This may be used for participant identification and tournament administration."
            selectedFile={value instanceof File ? value : null}
            error={errors.identityVerification?.playerPhoto?.message}
            onBlur={onBlur}
            onChange={(event) => {
              const file = event.target.files?.[0];
              onChange(file ?? undefined);
            }}
          />
        )}
      />
    </fieldset>
  );
}
