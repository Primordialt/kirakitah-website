"use client";

import { Input, Select } from "@/components/ui";
import { FileInput } from "@/components/ui/file-input";
import {
  IDENTIFICATION_TYPE_OPTIONS,
  getIdentificationNumberLabel,
  getIdentificationNumberPlaceholder,
} from "@/lib/identification";
import {
  MAX_IDENTITY_FILE_SIZE_BYTES,
  PLAYER_PHOTO_ACCEPTED_TYPES,
  formatAcceptedTypes,
  formatFileSize,
  validateIdentityFile,
} from "@/lib/identity-upload";
import { useEffect } from "react";
import { Controller, useWatch } from "react-hook-form";
import type { FormSectionProps } from "./types";
import type {
  UseFormClearErrors,
  UseFormSetError,
  UseFormSetValue,
} from "react-hook-form";
import type { RegistrationFormValues } from "@/domain/registration";

interface IdentityVerificationProps extends FormSectionProps {
  setValue: UseFormSetValue<RegistrationFormValues>;
  setError: UseFormSetError<RegistrationFormValues>;
  clearErrors: UseFormClearErrors<RegistrationFormValues>;
}

export function IdentityVerification({
  control,
  errors,
  register,
  setValue,
  setError,
  clearErrors,
}: IdentityVerificationProps) {
  const identificationType = useWatch({
    control,
    name: "identityVerification.identificationType",
  });

  useEffect(() => {
    setValue("identityVerification.identificationNumber", "");
  }, [identificationType, setValue]);

  const numberLabel = identificationType
    ? getIdentificationNumberLabel(identificationType)
    : "Identification number";

  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">IDENTITY VERIFICATION</legend>
      <p className="text-body-sm text-text-muted">
        Provide your identification details and a recent player photo for eligibility
        verification and tournament administration.
      </p>

      <Controller
        name="identityVerification.identificationType"
        control={control}
        render={({ field }) => (
          <Select
            label="Identification type"
            required
            placeholder="Select identification type"
            options={[...IDENTIFICATION_TYPE_OPTIONS]}
            error={errors.identityVerification?.identificationType?.message}
            {...field}
          />
        )}
      />

      <Input
        label={numberLabel}
        required
        disabled={!identificationType}
        placeholder={
          identificationType
            ? getIdentificationNumberPlaceholder(identificationType)
            : "Select an identification type first"
        }
        autoComplete="off"
        inputMode={identificationType === "nin" ? "numeric" : "text"}
        error={errors.identityVerification?.identificationNumber?.message}
        {...register("identityVerification.identificationNumber")}
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
            description={`Upload a recent clear photo of yourself. Accepted formats: ${formatAcceptedTypes(PLAYER_PHOTO_ACCEPTED_TYPES)}. Maximum photo size: ${formatFileSize(MAX_IDENTITY_FILE_SIZE_BYTES)}.`}
            selectedFile={value instanceof File ? value : null}
            error={errors.identityVerification?.playerPhoto?.message}
            onBlur={onBlur}
            onChange={(event) => {
              const input = event.target;
              const file = input.files?.[0];
              if (!file) {
                onChange(undefined);
                clearErrors("identityVerification.playerPhoto");
                return;
              }

              const validationError = validateIdentityFile(file, {
                label: "Player photo",
                acceptedTypes: PLAYER_PHOTO_ACCEPTED_TYPES,
                maxSizeBytes: MAX_IDENTITY_FILE_SIZE_BYTES,
              });

              if (validationError) {
                onChange(undefined);
                setError("identityVerification.playerPhoto", {
                  type: "validate",
                  message: validationError,
                });
                input.value = "";
                return;
              }

              clearErrors("identityVerification.playerPhoto");
              onChange(file);
              setValue("identityVerification.playerPhoto", file, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />
        )}
      />
    </fieldset>
  );
}
