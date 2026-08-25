import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { getAdminUserById } from "@/server/admin/users/service";
import { isRegistrationBackendConfigured } from "@/server/env";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await loadAdminSession("admin:manage");
  const { id } = await params;

  if (!isRegistrationBackendConfigured()) {
    notFound();
  }

  let admin = null;
  try {
    admin = await getAdminUserById(id);
  } catch {
    notFound();
  }

  if (!admin) {
    notFound();
  }

  return (
    <AdminShell session={session}>
      <p className="text-body-sm">
        <Link href="/admin/users" className="text-accent hover:underline">
          ← Administrators
        </Link>
      </p>
      <h1 className="mt-4 text-h2">{admin.displayName}</h1>
      <p className="mt-2 text-body text-text-secondary">{admin.email}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <dt className="text-body-sm text-text-muted">Role</dt>
          <dd className="mt-1 font-medium">{admin.role}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <dt className="text-body-sm text-text-muted">Status</dt>
          <dd className="mt-1 font-medium">
            {admin.active ? "Active" : "Inactive"}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <dt className="text-body-sm text-text-muted">Created</dt>
          <dd className="mt-1 font-medium">
            {new Date(admin.createdAt).toLocaleString()}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <dt className="text-body-sm text-text-muted">Updated</dt>
          <dd className="mt-1 font-medium">
            {admin.updatedAt
              ? new Date(admin.updatedAt).toLocaleString()
              : "—"}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <dt className="text-body-sm text-text-muted">Last login</dt>
          <dd className="mt-1 font-medium">
            {admin.lastLoginAt
              ? new Date(admin.lastLoginAt).toLocaleString()
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <AdminUserActions
          adminId={admin.id}
          role={admin.role}
          active={admin.active}
        />
      </div>
    </AdminShell>
  );
}
