"use client";

import { Button, Input } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import {
  clearRegistrationState,
  hasUsernameRegistrationState,
  readRegistrationState,
} from "@/lib/participant/registration-session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function RegisterPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const state = readRegistrationState();
    if (!hasUsernameRegistrationState(state)) {
      router.replace(
        state?.emailVerificationToken ? "/register/username" : "/register",
      );
      return;
    }
    setReady(true);
  }, [router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const state = readRegistrationState();
    if (!hasUsernameRegistrationState(state)) {
      router.replace("/register");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    const { response, payload } = await participantFetch(
      "/api/participant/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          email: state.email,
          emailVerificationToken: state.emailVerificationToken,
          username: state.username,
          password,
        }),
      },
    );

    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(apiErrorMessage(payload, "Unable to create account."));
      return;
    }

    clearRegistrationState();
    router.replace("/dashboard");
    router.refresh();
  };

  if (!ready) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-text-primary">CREATE YOUR PASSWORD</h1>
      <p className="mt-3 text-body text-text-secondary">
        Choose a strong password for your KIRAKITAH account.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          description="At least 12 characters."
        />
        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" loading={loading} className="w-full">
          CREATE ACCOUNT
        </Button>
      </form>
    </div>
  );
}
