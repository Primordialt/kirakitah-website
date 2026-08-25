"use client";

import { Input, Select } from "@/components/ui";
import { registrationPlatforms } from "@/config/esports";
import type { FormSectionProps } from "./types";

export function GamingInformation({ register, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">GAMING INFORMATION</legend>
      <Input
        label="Gamer Tag"
        description="Your eFootball username / gamer tag"
        placeholder="Enter your eFootball username"
        required
        autoComplete="off"
        error={errors.gamerTag?.message}
        {...register("gamerTag")}
      />
      <Input
        label="Game"
        readOnly
        disabled
        error={errors.game?.message}
        {...register("game")}
      />
      <Select
        label="Mobile platform"
        required
        placeholder="Select platform"
        options={registrationPlatforms}
        error={errors.platform?.message}
        {...register("platform")}
      />
      <Input
        label="eFootball information"
        description="Team name, player preferences, or other relevant gaming details"
        error={errors.gamingProfile?.message}
        {...register("gamingProfile")}
      />
    </fieldset>
  );
}
