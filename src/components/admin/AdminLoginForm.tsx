"use client";

import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-roles";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm({
  mode,
}: {
  mode: "mock" | "database" | "unavailable";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("REVIEWER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const body =
      mode === "mock"
        ? { email, role }
        : { email, password };

    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as {
      success?: boolean;
      error?: { code?: string; message: string };
    };

    setLoading(false);

    if (!response.ok || !payload.success) {
      if (payload.error?.code === "RATE_LIMITED") {
        setError("Too many sign-in attempts. Please try again later.");
      } else {
        setError(payload.error?.message ?? "Invalid email or password.");
      }
      return;
    }

    const next = searchParams.get("next") || "/admin";
    router.replace(next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  if (mode === "unavailable") {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-6">
        <h1 className="text-h2">Admin sign-in unavailable</h1>
        <p className="mt-3 text-body text-text-secondary">
          Administrator authentication is not configured for this environment.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="rounded-xl border border-border bg-surface-elevated p-6"
    >
      <h1 className="text-h2">Admin sign-in</h1>
      <p className="mt-2 text-body-sm text-text-muted">
        Sign in to manage KIRAKITAH GAMING 926 applications and reviews.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-email" className="text-label">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
          />
        </div>

        {mode === "database" ? (
          <div>
            <label htmlFor="admin-password" className="text-label">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="admin-role" className="text-label">
              Role (development only)
            </label>
            <select
              id="admin-role"
              value={role}
              onChange={(event) => setRole(event.target.value as AdminRole)}
              className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
            >
              {ADMIN_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        )}

        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-lg bg-brand-primary px-4 text-button text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
