"use client";

import { Input, Select } from "@/components/ui";
import { registrationCountries } from "@/config/esports";
import type { FormSectionProps } from "./types";

export function PlayerInformation({ register, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">PLAYER INFORMATION</legend>
      <Input
        label="Full name"
        required
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <Input
        label="Date of birth"
        type="date"
        required
        error={errors.dateOfBirth?.message}
        {...register("dateOfBirth")}
      />
      <Select
        label="Country"
        required
        placeholder="Select country"
        options={registrationCountries}
        error={errors.country?.message}
        {...register("country")}
      />
      <Input
        label="City / location"
        required
        error={errors.city?.message}
        {...register("city")}
      />
      <Input
        label="Email"
        type="email"
        required
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Phone number"
        type="tel"
        required
        autoComplete="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
    </fieldset>
  );
}
