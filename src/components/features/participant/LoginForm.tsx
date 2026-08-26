"use client";

import { Button, Input } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    const next = searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    router.replace(safeNext);
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-text-primary">LOGIN</h1>
      <p className="mt-3 text-body text-text-secondary">
        Sign in to your KIRAKITAH participant account.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        <Input
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
        <Button type="submit" loading={loading} className="w-full">
          LOGIN
        </Button>
      </form>

      <p className="mt-6 text-body-sm text-text-secondary">
        <Link
          href="/forgot-password"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Forgot password?
        </Link>
      </p>
      <p className="mt-4 text-body-sm text-text-secondary">
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
