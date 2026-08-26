"use client";

import { Button, Input } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { PARTICIPANT_ACCOUNT_EXISTS_MESSAGE } from "@/lib/participant/messages";
import { writeRegistrationState } from "@/lib/participant/registration-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "email" | "otp";

export function RegisterEmailForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChallenge = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setAccountExists(false);

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
      setAccountExists(true);
      setError(PARTICIPANT_ACCOUNT_EXISTS_MESSAGE);
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
    setAccountExists(false);

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
      setAccountExists(true);
      setError(PARTICIPANT_ACCOUNT_EXISTS_MESSAGE);
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

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-text-primary">JOIN KIRAKITAH</h1>
      <p className="mt-3 text-body text-text-secondary">
        Create your KIRAKITAH participant account.
      </p>

      {step === "email" ? (
        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => void onChallenge(event)}
          noValidate
        >
          <Input
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
              {accountExists ? (
                <>
                  {" "}
                  <Link
                    href="/login"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    LOGIN
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          <Button type="submit" loading={loading} className="w-full">
            CONTINUE
          </Button>
        </form>
      ) : (
        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => void onVerify(event)}
          noValidate
        >
          <p className="text-body-sm text-text-secondary">
            Enter the verification code sent to{" "}
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
              {accountExists ? (
                <>
                  {" "}
                  <Link
                    href="/login"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    LOGIN
                  </Link>
                </>
              ) : null}
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
      )}

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
