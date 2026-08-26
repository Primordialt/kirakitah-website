"use client";

import { Button, Input } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setError("This reset link is invalid or has expired.");
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
      "/api/participant/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ token, password }),
      },
    );

    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(
        apiErrorMessage(
          payload,
          "This reset link is invalid or has expired.",
        ),
      );
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-h2 text-text-primary">PASSWORD RESET</h1>
        <p className="mt-3 text-body text-text-secondary" role="status">
          Your password has been reset successfully.
        </p>
        <Button href="/login" className="mt-8 w-full">
          LOGIN
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-text-primary">RESET PASSWORD</h1>
      <p className="mt-3 text-body text-text-secondary">
        Choose a new password for your KIRAKITAH participant account.
      </p>

      {!token ? (
        <p role="alert" className="mt-8 text-body-sm text-error">
          This reset link is invalid or has expired.
        </p>
      ) : (
        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => void onSubmit(event)}
          noValidate
        >
          <Input
            label="New password"
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
            RESET PASSWORD
          </Button>
        </form>
      )}

      <p className="mt-6 text-body-sm text-text-secondary">
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Back to Login
        </Link>
      </p>
    </div>
  );
}
