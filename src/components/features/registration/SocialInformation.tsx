"use client";

import { Input } from "@/components/ui";
import type { FormSectionProps } from "./types";

export function SocialInformation({ register, errors }: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-h4 text-text-primary">SOCIAL (OPTIONAL)</legend>
      <Input
        label="Instagram handle"
        error={errors.socialHandles?.instagram?.message}
        {...register("socialHandles.instagram")}
      />
      <Input
        label="TikTok handle"
        error={errors.socialHandles?.tiktok?.message}
        {...register("socialHandles.tiktok")}
      />
      <Input
        label="YouTube channel"
        error={errors.socialHandles?.youtube?.message}
        {...register("socialHandles.youtube")}
      />
    </fieldset>
  );
}
