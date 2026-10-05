import { AdminArenaPanel } from "@/components/admin/AdminArenaPanel";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arena — KIRAKITAH Admin",
  robots: { index: false, follow: false },
};

export default async function AdminArenaPage() {
  const session = await loadAdminSession("arena:view");
  return (
    <AdminShell session={session}>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-h2">KIRAKITAH Arena</h1>
        <p className="text-body-sm text-text-muted">
          Operate Quickfire and TypeRush arenas. Enable only after legal/compliance review.
        </p>
        <AdminArenaPanel />
      </div>
    </AdminShell>
  );
}
