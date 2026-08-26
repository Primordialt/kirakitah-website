"use client";

import { Button, Input } from "@/components/ui";
import {
  hasVerifiedRegistrationState,
  readRegistrationState,
  writeRegistrationState,
} from "@/lib/participant/registration-session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function validateUsernameClient(username: string): string | undefined {
  const trimmed = username.trim();
  if (trimmed.length < 3) return "Username must be at least 3 characters.";
  if (trimmed.length > 24) return "Username must be at most 24 characters.";
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Username may only contain letters, numbers, and underscores.";
  }
  return undefined;
}

export function RegisterUsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const state = readRegistrationState();
    if (!hasVerifiedRegistrationState(state)) {
      router.replace("/register");
      return;
    }
    if (state.username) setUsername(state.username);
    setReady(true);
  }, [router]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const state = readRegistrationState();
    if (!hasVerifiedRegistrationState(state)) {
      router.replace("/register");
      return;
    }

    const validationError = validateUsernameClient(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    writeRegistrationState({
      ...state,
      username: username.trim(),
    });
    router.push("/register/password");
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
      <h1 className="text-h2 text-text-primary">CREATE YOUR USERNAME</h1>
      <p className="mt-3 text-body text-text-secondary">
        Choose a username for your KIRAKITAH account.
      </p>
      <p className="mt-2 text-body-sm text-text-muted">
        Account username is NOT the eFootball Gamer Tag.
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <Input
          label="Username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setError(null);
          }}
          description="3–24 characters. Letters, numbers, and underscores only."
          error={error ?? undefined}
        />
        <Button type="submit" className="w-full">
          CONTINUE
        </Button>
      </form>
    </div>
  );
}
