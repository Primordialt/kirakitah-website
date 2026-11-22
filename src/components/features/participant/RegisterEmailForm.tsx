"use client";

import { Button, Input } from "@/components/ui";
import { auth0SocialLoginPath, isAuth0LoginEnabled } from "@/lib/auth0-paths";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { PARTICIPANT_ACCOUNT_EXISTS_MESSAGE } from "@/lib/participant/messages";
import { writeRegistrationState } from "@/lib/participant/registration-session";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Step = "email" | "otp" | "already_registered";

export function RegisterEmailForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email")?.trim() ?? "";
  const auth0Enabled = isAuth0LoginEnabled();
  const finishProfile = searchParams.get("notice") === "finish-profile";
  const offerSocial = auth0Enabled && !finishProfile;
  const [email, setEmail] = useState(prefilledEmail);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(!offerSocial || prefilledEmail.length > 0);
  const emailRef = useRef<HTMLInputElement>(null);
  const openedByUser = useRef(false);

  const onChallenge = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { response, payload } = await participantFetch<{
      challengeId?: string;
    }>("/api/participant/auth/email/challenge", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });

    setLoading(false);

    if (
      payload.error?.code === "ACCOUNT_EXISTS" ||
      payload.error?.code === "DUPLICATE_EMAIL" ||
      response.status === 409
    ) {
      setStep("already_registered");
      return;
    }

    if (!response.ok || !payload.challengeId) {
      setError(apiErrorMessage(payload, "Unable to send verification code."));
      return;
    }

    setChallengeId(payload.challengeId);
    setStep("otp");
  };

  const onVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challengeId) return;

    setLoading(true);
    setError(null);

    const { response, payload } = await participantFetch<{
      emailVerificationToken?: string;
    }>("/api/participant/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim(),
        challengeId,
        code: code.trim(),
      }),
    });

    setLoading(false);

    if (
      payload.error?.code === "ACCOUNT_EXISTS" ||
      payload.error?.code === "DUPLICATE_EMAIL" ||
      response.status === 409
    ) {
      setStep("already_registered");
      return;
    }

    if (!response.ok || !payload.emailVerificationToken) {
      setError(apiErrorMessage(payload, "Unable to verify email."));
      return;
    }

    writeRegistrationState({
      email: email.trim(),
      emailVerificationToken: payload.emailVerificationToken,
      challengeId,
    });
    router.push("/register/username");
  };

  useEffect(() => {
    if (openedByUser.current) emailRef.current?.focus();
  }, [emailOpen]);

  if (step === "already_registered") {
    return (
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-h2 text-text-primary">EMAIL ALREADY REGISTERED</h1>
        <p className="mt-3 text-body text-text-secondary" role="status">
          {PARTICIPANT_ACCOUNT_EXISTS_MESSAGE}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button href="/login" className="w-full">
            LOGIN
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("email");
              setCode("");
              setChallengeId(null);
              setError(null);
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-text-primary">
        {step === "otp" ? "EMAIL VERIFICATION" : "JOIN KIRAKITAH"}
      </h1>
      <p className="mt-3 text-body text-text-secondary">
        {step === "otp"
          ? "Enter the 6-digit code we sent to your email."
          : "Create your KIRAKITAH participant account."}
      </p>
      {step === "email" && finishProfile ? (
        <p className="mt-4 text-body-sm text-text-secondary" role="status">
          Your sign-up is confirmed. Finish your KIRAKITAH profile with the
          same email.
        </p>
      ) : null}
      {step === "email" && offerSocial ? (
        <div className="mt-8 flex flex-col gap-3">
          <Button href={auth0SocialLoginPath("google")} size="lg" className="w-full">
            Continue with Google
          </Button>
          <Button
            href={auth0SocialLoginPath("apple")}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Continue with Apple
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            aria-expanded={emailOpen}
            aria-controls="email-register"
            onClick={() => {
              openedByUser.current = true;
              setEmailOpen(true);
            }}
          >
            Continue with Email
          </Button>
        </div>
      ) : null}

      {step === "email" && emailOpen ? (
        <form
          id="email-register"
          className="mt-8 space-y-5"
          onSubmit={(event) => void onChallenge(event)}
          noValidate
        >
          <Input
            ref={emailRef}
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error ? (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading} size="lg" className="w-full">
            CONTINUE
          </Button>
        </form>
      ) : step === "otp" ? (
        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => void onVerify(event)}
          noValidate
        >
          <p className="text-body-sm text-text-secondary">
            Code sent to{" "}
            <span className="font-medium text-text-primary">{email}</span>.
          </p>
          <Input
            label="Verification code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          {error ? (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading} className="w-full">
            VERIFY
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </Button>
        </form>
      ) : null}

      <p className="mt-8 text-body-sm text-text-secondary">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          LOGIN
        </Link>
      </p>
    </div>
  );
}
