"use client";

import { Button, Input } from "@/components/ui";
import {
  auth0SocialLoginPath,
  isAuth0LoginEnabled,
  safeAppPath,
} from "@/lib/auth0-paths";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth0Enabled = isAuth0LoginEnabled();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(!auth0Enabled);
  const identifierRef = useRef<HTMLInputElement>(null);
  const openedByUser = useRef(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { response, payload } = await participantFetch(
      "/api/participant/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      },
    );

    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(
        apiErrorMessage(payload, "Invalid email/username or password."),
      );
      return;
    }

    router.replace(safeAppPath(searchParams.get("next")));
    router.refresh();
  };

  useEffect(() => {
    if (openedByUser.current) identifierRef.current?.focus();
  }, [passwordOpen]);

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-text-primary">LOGIN</h1>
      <p className="mt-3 text-body text-text-secondary">
        Sign in to your KIRAKITAH participant account.
      </p>
      {searchParams.get("error") === "unavailable" ? (
        <p role="alert" className="mt-4 text-body-sm text-error">
          This account cannot sign in right now.
        </p>
      ) : null}

      {auth0Enabled ? (
        <div className="mt-8 flex flex-col gap-3">
          <Button
            href={auth0SocialLoginPath("google", searchParams.get("next"))}
            size="lg"
            className="w-full"
          >
            Continue with Google
          </Button>
          <Button
            href={auth0SocialLoginPath("apple", searchParams.get("next"))}
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
            aria-expanded={passwordOpen}
            aria-controls="password-login"
            onClick={() => {
              openedByUser.current = true;
              setPasswordOpen(true);
            }}
          >
            Continue with Email or Username
          </Button>
        </div>
      ) : null}

      {passwordOpen ? (
        <form
          id="password-login"
          className="mt-8 space-y-5"
          onSubmit={(event) => void onSubmit(event)}
          noValidate
        >
          <Input
            ref={identifierRef}
            label="Email or username"
            name="identifier"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading} size="lg" className="w-full">
            LOGIN
          </Button>
          <p className="text-body-sm text-text-secondary">
            <Link
              href="/forgot-password"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        </form>
      ) : null}
      <p className="mt-8 text-body-sm text-text-secondary">
        Need an account?{" "}
        <Link
          href="/register"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          REGISTER
        </Link>
      </p>
    </div>
  );
}
