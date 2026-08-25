import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { CreateAdminUserForm } from "@/components/admin/CreateAdminUserForm";

export default async function NewAdminUserPage() {
  const session = await loadAdminSession("admin:manage");

  return (
    <AdminShell session={session}>
      <p className="text-body-sm">
        <Link href="/admin/users" className="text-accent hover:underline">
          ← Administrators
        </Link>
      </p>
      <h1 className="mt-4 text-h2">Create administrator</h1>
      <p className="mt-2 text-body text-text-secondary">
        Provision a staff account with a strong password. Prefer REVIEWER for
        application, identity and social review work.
      </p>
      <div className="mt-6">
        <CreateAdminUserForm />
      </div>
    </AdminShell>
  );
}
