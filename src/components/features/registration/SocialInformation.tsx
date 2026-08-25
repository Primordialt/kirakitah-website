"use client";

import { Checkbox, Input } from "@/components/ui";
import { followKirakitahCopy } from "@/config/eligibility-requirements";
import { REQUIRED_SOCIAL_ACCOUNTS } from "@/config/social";
import { Controller } from "react-hook-form";
import type { FormSectionProps } from "./types";

export function SocialInformation({ register, control, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">
        {followKirakitahCopy.legend}
      </legend>
      <p className="text-body-sm text-text-secondary">
        {followKirakitahCopy.supporting}
      </p>

      <ul className="space-y-2 text-body-sm">
        {REQUIRED_SOCIAL_ACCOUNTS.map((account) => (
          <li key={account.platform}>
            <span className="font-medium text-text-primary">{account.label}: </span>
            <a
              href={account.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50"
            >
              {account.href.replace(/^https?:\/\//, "")}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="text-body-sm text-text-muted">
        {followKirakitahCopy.reviewNote}
      </p>

      {REQUIRED_SOCIAL_ACCOUNTS.map((account) => (
        <Input
          key={account.platform}
          label={account.handleFieldLabel}
          required
          description={`Your ${account.label} account used to follow KIRAKITAH.`}
          placeholder={account.handlePlaceholder}
          autoComplete="off"
          error={errors.socialHandles?.[account.platform]?.message}
          {...register(`socialHandles.${account.platform}`)}
        />
      ))}

      <Controller
        name="socialFollowAttestation"
        control={control}
        render={({ field: { value, onChange, onBlur, name, ref } }) => (
          <Checkbox
            ref={ref}
            name={name}
            checked={Boolean(value)}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.checked)}
            error={errors.socialFollowAttestation?.message}
            label={followKirakitahCopy.attestationLabel}
            description={followKirakitahCopy.attestationDescription}
          />
        )}
      />
    </fieldset>
  );
}
