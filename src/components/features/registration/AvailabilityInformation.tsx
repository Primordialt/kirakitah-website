"use client";

import { Checkbox, Select } from "@/components/ui";
import {
  registrationAvailabilityOptions,
  registrationTimezones,
} from "@/config/esports";
import { Controller } from "react-hook-form";
import type { FormSectionProps } from "./types";

export function AvailabilityInformation({ register, control, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">AVAILABILITY</legend>
      <Select
        label="Time zone"
        required
        placeholder="Select time zone"
        options={registrationTimezones}
        error={errors.timezone?.message}
        {...register("timezone")}
      />
      <div className="flex flex-col gap-3">
        <p className="text-label text-text-primary">
          Tournament availability <span className="text-error">*</span>
        </p>
        <Controller
          name="availability"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-3">
              {registrationAvailabilityOptions.map((option) => {
                const checked = field.value?.includes(option.value) ?? false;
                return (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    checked={checked}
                    onChange={(event) => {
                      const next = new Set(field.value ?? []);
                      if (event.target.checked) {
                        next.add(option.value);
                      } else {
                        next.delete(option.value);
                      }
                      field.onChange(Array.from(next));
                    }}
                  />
                );
              })}
            </div>
          )}
        />
        {errors.availability?.message && (
          <p className="text-body-sm text-error" role="alert">
            {errors.availability.message}
          </p>
        )}
      </div>
    </fieldset>
  );
}
