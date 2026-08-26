"use client";

import { Button, Input } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { response, payload } = await participantFetch<{
      success?: boolean;
      message?: string;
    }>("/api/participant/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });

    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(
        apiErrorMessage(
          payload,
          "Unable to process password reset. Please try again.",
        ),
      );
      return;
    }

    setMessage(
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : "If an account exists for this email, we've sent a password reset link.",
    );
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-text-primary">FORGOT PASSWORD</h1>
      <p className="mt-3 text-body text-text-secondary">
        Enter the email for your KIRAKITAH participant account and we&apos;ll
        send a reset link if it exists.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => void onSubmit(event)}
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
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-body-sm text-text-secondary">
            {message}
          </p>
        ) : null}
        <Button type="submit" loading={loading} className="w-full">
          SEND RESET LINK
        </Button>
      </form>

      <p className="mt-6 text-body-sm text-text-secondary">
        Remembered your password?{" "}
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
