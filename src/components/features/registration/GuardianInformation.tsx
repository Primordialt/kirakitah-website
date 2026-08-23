"use client";

import { Input, Checkbox } from "@/components/ui";
import { Controller } from "react-hook-form";
import type { FormSectionProps } from "./types";

export function GuardianInformation({ register, control, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5 rounded-xl border border-border-interactive bg-brand-primary/5 p-6">
      <legend className="text-h4 text-text-primary">
        PARENT / GUARDIAN INFORMATION
      </legend>
      <Input
        label="Parent / guardian name"
        required
        error={errors.guardian?.fullName?.message}
        {...register("guardian.fullName")}
      />
      <Input
        label="Relationship"
        required
        error={errors.guardian?.relationship?.message}
        {...register("guardian.relationship")}
      />
      <Input
        label="Guardian email"
        type="email"
        required
        error={errors.guardian?.email?.message}
        {...register("guardian.email")}
      />
      <Input
        label="Guardian phone"
        type="tel"
        required
        error={errors.guardian?.phone?.message}
        {...register("guardian.phone")}
      />
      <Controller
        name="guardian.consent"
        control={control}
        render={({ field }) => (
          <Checkbox
            label="I confirm I am the parent or guardian and consent to this registration"
            required
            checked={field.value === true}
            onChange={(event) => field.onChange(event.target.checked || undefined)}
            error={errors.guardian?.consent?.message}
          />
        )}
      />
    </fieldset>
  );
}
