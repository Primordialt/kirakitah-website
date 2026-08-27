"use client";

import { useId, useState } from "react";
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
  const dialogTitleId = useId();
  const [selectedRole, setSelectedRole] = useState<AdminRole>(role);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

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

  const onDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${adminId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message: string };
    };
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error?.message ?? "Unable to delete administrator.");
      return;
    }
    router.push("/admin/users");
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
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setDeleteOpen(true);
            setConfirmation("");
            setError(null);
          }}
          className="h-10 rounded-lg border border-error px-4 text-button text-error disabled:opacity-50"
        >
          Delete administrator
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setDeleteOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={dialogTitleId} className="text-h4">
              Delete administrator?
            </h3>
            <p className="mt-3 text-body-sm text-text-secondary">
              This deactivates and anonymizes the administrator account. Audit
              history is preserved. Type DELETE to confirm.
            </p>
            <form className="mt-4 space-y-3" onSubmit={(e) => void onDelete(e)}>
              <label className="block text-label" htmlFor="admin-delete-confirm">
                Confirmation
              </label>
              <input
                id="admin-delete-confirm"
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                required
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading || confirmation.trim().toUpperCase() !== "DELETE"}
                  className="h-10 rounded-lg bg-error px-4 text-button text-white disabled:opacity-50"
                >
                  Delete administrator
                </button>
                <button
                  type="button"
                  className="h-10 rounded-lg border border-border px-4 text-button"
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
