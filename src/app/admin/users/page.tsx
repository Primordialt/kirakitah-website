import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { listAdminUsers } from "@/server/admin/users/service";
import { isRegistrationBackendConfigured } from "@/server/env";
import { ADMIN_ROLES } from "@/lib/admin-roles";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("admin:manage");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const role = typeof params.role === "string" ? params.role : "";
  const activeParam = typeof params.active === "string" ? params.active : "";
  const page = Number(params.page ?? "1") || 1;

  let result = {
    items: [] as Awaited<ReturnType<typeof listAdminUsers>>["items"],
    page,
    pageSize: 25,
    total: 0,
  };
  let unavailable = false;

  if (isRegistrationBackendConfigured()) {
    try {
      result = await listAdminUsers({
        query: q || undefined,
        role: role || undefined,
        active:
          activeParam === "true"
            ? true
            : activeParam === "false"
              ? false
              : undefined,
        page,
        pageSize: 25,
      });
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  return (
    <AdminShell session={session}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h2">Manage Administrators</h1>
          <p className="mt-2 text-body text-text-secondary">
            SUPER_ADMIN-only provisioning and role management. Passwords are
            never displayed.
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="rounded-lg bg-brand-primary px-4 py-2 text-button text-white"
        >
          Create administrator
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          className="h-10 min-w-[12rem] flex-1 rounded-lg border border-border bg-surface px-3 text-body"
          aria-label="Search administrators"
        />
        <select
          name="role"
          defaultValue={role}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-body"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {ADMIN_ROLES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          name="active"
          defaultValue={activeParam}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-body"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-border-interactive px-4 text-button"
        >
          Filter
        </button>
      </form>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Administrator directory unavailable in this environment.
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-6 text-body-sm text-text-muted">
          No administrators match the current filters.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-body-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Last login</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((admin) => (
                <tr key={admin.id} className="border-b border-border">
                  <td className="px-3 py-3">{admin.displayName}</td>
                  <td className="px-3 py-3">{admin.email}</td>
                  <td className="px-3 py-3">{admin.role}</td>
                  <td className="px-3 py-3">
                    {admin.active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-3 py-3">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    {admin.lastLoginAt
                      ? new Date(admin.lastLoginAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/users/${admin.id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
