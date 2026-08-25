"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-roles";

export function AdminUserActions({
  adminId,
  role,
  active,
}: {
  adminId: string;
  role: AdminRole;
  active: boolean;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AdminRole>(role);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const patch = async (body: { role?: AdminRole; active?: boolean }) => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${adminId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);

    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to update administrator.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-elevated p-4">
      <h2 className="text-h3">Actions</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="edit-admin-role" className="text-label">
            Role
          </label>
          <select
            id="edit-admin-role"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as AdminRole)}
            className="mt-1 flex h-10 rounded-lg border border-border bg-surface px-3 text-body"
          >
            {ADMIN_ROLES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={loading || selectedRole === role}
          onClick={() => void patch({ role: selectedRole })}
          className="h-10 rounded-lg border border-border-interactive px-4 text-button disabled:opacity-50"
        >
          Save role
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void patch({ active: !active })}
          className="h-10 rounded-lg bg-brand-primary px-4 text-button text-white disabled:opacity-50"
        >
          {active ? "Deactivate" : "Activate"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
