import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { AdminWalletPanel } from "@/components/admin/AdminWalletPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet operations — KIRAKITAH Admin",
  robots: { index: false, follow: false },
};

export default async function AdminWalletPage() {
  const session = await loadAdminSession("wallet:finance");
  return (
    <AdminShell session={session}>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-h2">Wallet operations</h1>
        <p className="text-body-sm text-text-muted">
          Super admin view of NOWPayments deposits, payouts, and audited adjustments.
        </p>
        <AdminWalletPanel />
      </div>
    </AdminShell>
  );
}
