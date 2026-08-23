"use client";

import { Checkbox } from "@/components/ui";
import Link from "next/link";
import { Controller } from "react-hook-form";
import type { FormSectionProps } from "./types";

const consentItems = [
  {
    name: "consents.rules" as const,
    label: (
      <>
        I have read and accept the{" "}
        <Link
          href="/esports/rules"
          className="text-accent underline-offset-2 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          tournament rules
        </Link>
      </>
    ),
  },
  {
    name: "consents.terms" as const,
    label: "I accept the terms and conditions",
  },
  {
    name: "consents.privacy" as const,
    label: "I accept the privacy policy",
  },
  {
    name: "consents.codeOfConduct" as const,
    label: "I agree to the code of conduct",
  },
  {
    name: "consents.mediaConsent" as const,
    label: "I consent to media coverage of tournament participation",
  },
];

export function ConsentSection({ control, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-h4 text-text-primary">CONSENT</legend>
      {consentItems.map((item) => (
        <Controller
          key={item.name}
          name={item.name}
          control={control}
          render={({ field }) => (
            <Checkbox
              label={item.label}
              required
              checked={field.value === true}
              onChange={(event) => field.onChange(event.target.checked || undefined)}
              error={
                item.name === "consents.rules"
                  ? errors.consents?.rules?.message
                  : item.name === "consents.terms"
                    ? errors.consents?.terms?.message
                    : item.name === "consents.privacy"
                      ? errors.consents?.privacy?.message
                      : item.name === "consents.codeOfConduct"
                        ? errors.consents?.codeOfConduct?.message
                        : errors.consents?.mediaConsent?.message
              }
            />
          )}
        />
      ))}
    </fieldset>
  );
}
