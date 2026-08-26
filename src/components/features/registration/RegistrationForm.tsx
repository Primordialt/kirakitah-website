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
import {
  EmailPreVerificationGate,
  type EmailPreVerificationState,
} from "./EmailPreVerificationGate";

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
    x: "",
    instagram: "",
    tiktok: "",
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailVerification, setEmailVerification] =
    useState<EmailPreVerificationState>({
      email: "",
      verified: false,
    });

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
  const fullName = watch("fullName");
  const showGuardian = requiresGuardian(dateOfBirth);
  const emailVerified = Boolean(
    emailVerification.verified && emailVerification.emailVerificationToken,
  );

  useEffect(() => {
    if (!showGuardian) {
      setValue("guardian", undefined);
    }
  }, [showGuardian, setValue]);

  useEffect(() => {
    setValue("email", emailVerification.email, { shouldValidate: true });
  }, [emailVerification.email, setValue]);

  const onSubmit = async (data: RegistrationFormValues) => {
    if (!emailVerification.emailVerificationToken || !emailVerification.verified) {
      setSubmitError("Verify your email address before submitting your application.");
      return;
    }

    setStatus("submitting");
    setSubmitError(null);
    try {
      const result = await services.registration.submit(
        {
          ...data,
          email: emailVerification.email.trim().toLowerCase(),
        },
        {
          includeGuardian: showGuardian,
          emailVerificationToken: emailVerification.emailVerificationToken,
        },
      );

      if (result.success) {
        setReferenceId(result.referenceId);
        setContactVerification(result.contactVerification);
        setStatus("success");
      } else {
        setStatus("failure");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit registration.";
      if (
        message.includes("already registered") ||
        message.includes("Verify your email") ||
        message.includes("expired")
      ) {
        setSubmitError(message);
        setStatus("idle");
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.error("Registration submission failed", error);
      }
      setStatus("failure");
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setSubmitError(null);
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

      <EmailPreVerificationGate
        fullName={fullName}
        value={emailVerification}
        onChange={setEmailVerification}
        disabled={isSubmitting}
      />
      {errors.email?.message ? (
        <p className="text-body-sm text-error">{errors.email.message}</p>
      ) : null}

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
      <input type="hidden" {...register("email")} />

      {submitError ? (
        <p role="alert" className="text-body-sm text-error">
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting || status === "submitting"}
        disabled={isSubmitting || !emailVerified}
      >
        SUBMIT APPLICATION
      </Button>
      {!emailVerified ? (
        <p className="text-body-sm text-text-muted">
          Verify your email above before submitting.
        </p>
      ) : null}
    </form>
  );
}
