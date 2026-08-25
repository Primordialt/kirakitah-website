"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registrationSchema,
  requiresGuardian,
  type RegistrationFormValues,
  type RegistrationResult,
} from "@/domain/registration";
import { TOURNAMENT_EVENT_ID } from "@/data/mocks/tournaments";
import { COMPETITION_NAME } from "@/config/competition";
import { services } from "@/services";
import { Button } from "@/components/ui";
import { PlayerInformation } from "./PlayerInformation";
import { IdentityVerification } from "./IdentityVerification";
import { GamingInformation } from "./GamingInformation";
import { AvailabilityInformation } from "./AvailabilityInformation";
import { SocialInformation } from "./SocialInformation";
import { ConsentSection } from "./ConsentSection";
import { GuardianInformation } from "./GuardianInformation";
import { RegistrationSuccess } from "./RegistrationSuccess";
import { RegistrationError } from "./RegistrationError";

type FormStatus = "idle" | "submitting" | "success" | "failure";

const defaultValues: RegistrationFormValues = {
  fullName: "",
  dateOfBirth: "",
  country: "",
  city: "",
  email: "",
  phone: "",
  identityVerification: {
    identificationType: "",
    identificationNumber: "",
    playerPhoto: undefined,
  },
  gamerTag: "",
  game: "eFootball Mobile",
  platform: "",
  gamingProfile: "",
  timezone: "",
  availability: [],
  socialHandles: {
    instagram: "",
    tiktok: "",
    youtube: "",
  },
  socialFollowAttestation: false as unknown as true,
  consents: {
    rules: false as unknown as true,
    terms: false as unknown as true,
    privacy: false as unknown as true,
    codeOfConduct: false as unknown as true,
    mediaConsent: false as unknown as true,
  },
  eventId: TOURNAMENT_EVENT_ID,
} as unknown as RegistrationFormValues;

export function RegistrationForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [contactVerification, setContactVerification] = useState<
    RegistrationResult["contactVerification"] | undefined
  >(undefined);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const dateOfBirth = watch("dateOfBirth");
  const showGuardian = requiresGuardian(dateOfBirth);

  useEffect(() => {
    if (!showGuardian) {
      setValue("guardian", undefined);
    }
  }, [showGuardian, setValue]);

  const onSubmit = async (data: RegistrationFormValues) => {
    setStatus("submitting");
    try {
      const result = await services.registration.submit(data, {
        includeGuardian: showGuardian,
      });

      if (result.success) {
        setReferenceId(result.referenceId);
        setContactVerification(result.contactVerification);
        setStatus("success");
      } else {
        setStatus("failure");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Registration submission failed", error);
      }
      setStatus("failure");
    }
  };

  const handleRetry = () => {
    setStatus("idle");
  };

  if (status === "success") {
    return (
      <RegistrationSuccess
        referenceId={referenceId ?? undefined}
        contactVerification={contactVerification}
      />
    );
  }

  if (status === "failure") {
    return <RegistrationError onRetry={handleRetry} />;
  }

  const formStatusLabel = isSubmitting
    ? "Submitting application"
    : isDirty
      ? "Editing application"
      : "Registration form";

  const onInvalid = () => {
    requestAnimationFrame(() => {
      const firstInvalid = document.querySelector('[aria-invalid="true"]');
      if (firstInvalid instanceof HTMLElement) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView?.({ behavior: "smooth", block: "center" });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto flex max-w-2xl flex-col gap-10"
      noValidate
      aria-label={`${COMPETITION_NAME} registration`}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {formStatusLabel}
      </p>

      <PlayerInformation register={register} control={control} errors={errors} />
      <IdentityVerification
        register={register}
        control={control}
        errors={errors}
        setValue={setValue}
        setError={setError}
        clearErrors={clearErrors}
      />
      <GamingInformation register={register} control={control} errors={errors} />
      <AvailabilityInformation register={register} control={control} errors={errors} />
      <SocialInformation register={register} control={control} errors={errors} />
      <ConsentSection register={register} control={control} errors={errors} />

      {showGuardian && (
        <GuardianInformation register={register} control={control} errors={errors} />
      )}

      <input type="hidden" {...register("eventId")} />
      <input type="hidden" {...register("game")} />

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting || status === "submitting"}
        disabled={isSubmitting}
      >
        SUBMIT APPLICATION
      </Button>
    </form>
  );
}
