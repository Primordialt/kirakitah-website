"use client";

import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-roles";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm({
  mockAuthAvailable,
}: {
  mockAuthAvailable: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("reviewer@kirakitah.local");
  const [role, setRole] = useState<AdminRole>("REVIEWER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };

    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to sign in.");
      return;
    }

    const next = searchParams.get("next") || "/admin";
    router.replace(next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  if (!mockAuthAvailable) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-6">
        <h1 className="text-h2">Admin sign-in unavailable</h1>
        <p className="mt-3 text-body text-text-secondary">
          Production admin authentication is pending provider configuration.
          Mock authentication is disabled in production.
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
        Development authentication only. Not available in production.
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
          />
        </div>
        <div>
          <label htmlFor="admin-role" className="text-label">
            Role
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
