"use client";

import { Checkbox, Input } from "@/components/ui";
import { COMPETITION_NAME } from "@/config/competition";
import { OFFICIAL_SOCIAL_ACCOUNTS } from "@/config/social";
import { Controller } from "react-hook-form";
import type { FormSectionProps } from "./types";

export function SocialInformation({ register, control, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">SOCIALS</legend>
      <p className="text-body-sm text-text-secondary">
        To participate in KIRAKITAH tournaments, you must follow KIRAKITAH on all
        official social platforms. Following KIRAKITAH on all official social
        platforms is required before participating in the tournament.
      </p>
      <p className="text-body-sm text-text-muted">
        Provide your usernames below. Our team will manually review that you
        follow the official KIRAKITAH accounts. Submitting this form does not
        verify your follows.
      </p>

      <ul className="space-y-2 text-body-sm">
        {OFFICIAL_SOCIAL_ACCOUNTS.map((account) => (
          <li key={account.platform}>
            <span className="font-medium text-text-primary">{account.label}: </span>
            {account.href ? (
              <a
                href={account.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-2 hover:underline"
              >
                Official KIRAKITAH {account.label}
              </a>
            ) : (
              <span className="text-text-muted">
                Official KIRAKITAH {account.label} account (link pending
                publication)
              </span>
            )}
          </li>
        ))}
      </ul>

      {OFFICIAL_SOCIAL_ACCOUNTS.map((account) => (
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
            label={`I confirm that I follow KIRAKITAH on all official social platforms listed above.`}
            description={`Required to participate in ${COMPETITION_NAME}. This attestation is not automatic verification.`}
          />
        )}
      />
    </fieldset>
  );
}
