"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-roles";

export function CreateAdminUserForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("REVIEWER");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        email,
        role,
        password,
        confirmPassword,
      }),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      admin?: { id: string };
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success || !payload.admin) {
      setError(payload.error?.message ?? "Unable to create administrator.");
      return;
    }

    router.push(`/admin/users/${payload.admin.id}`);
    router.refresh();
  };

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="max-w-xl space-y-4 rounded-xl border border-border bg-surface-elevated p-6"
    >
      <div>
        <label htmlFor="admin-full-name" className="text-label">
          Full name
        </label>
        <input
          id="admin-full-name"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
        />
      </div>
      <div>
        <label htmlFor="admin-create-email" className="text-label">
          Email
        </label>
        <input
          id="admin-create-email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
        />
      </div>
      <div>
        <label htmlFor="admin-create-role" className="text-label">
          Role
        </label>
        <select
          id="admin-create-role"
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
      <div>
        <label htmlFor="admin-create-password" className="text-label">
          Password
        </label>
        <input
          id="admin-create-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
        />
        <p className="mt-1 text-body-sm text-text-muted">
          Minimum 12 characters. Prefer 16+ with mixed characters.
        </p>
      </div>
      <div>
        <label htmlFor="admin-confirm-password" className="text-label">
          Confirm password
        </label>
        <input
          id="admin-confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-1 flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
        />
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
        {loading ? "Creating…" : "Create administrator"}
      </button>
    </form>
  );
}
