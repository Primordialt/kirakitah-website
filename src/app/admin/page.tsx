import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { getAdminDashboardStats } from "@/server/admin/registration/service";
import { isRegistrationBackendConfigured } from "@/server/env";

export default async function AdminDashboardPage() {
  const session = await loadAdminSession("dashboard:view");

  let stats = {
    totalApplications: 0,
    pendingIdentityReviews: 0,
    pendingSocialReviews: 0,
    pendingContactVerification: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  };

  let unavailable = false;
  if (isRegistrationBackendConfigured()) {
    try {
      stats = await getAdminDashboardStats();
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  const cards = [
    { label: "Total applications", value: stats.totalApplications },
    { label: "Pending identity reviews", value: stats.pendingIdentityReviews },
    { label: "Pending social reviews", value: stats.pendingSocialReviews },
    {
      label: "Pending contact verification",
      value: stats.pendingContactVerification,
    },
    { label: "Under review", value: stats.underReview },
    { label: "Approved applications", value: stats.approved },
    { label: "Rejected applications", value: stats.rejected },
  ];

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Registration operations</h1>
      <p className="mt-2 text-body text-text-secondary">
        Internal review workspace for KIRAKITAH GAMING 926 applications.
      </p>

      {unavailable ? (
        <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-body-sm text-text-muted">
          Registration database is not configured in this environment. Statistics
          unavailable.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li
              key={card.label}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <p className="text-body-sm text-text-muted">{card.label}</p>
              <p className="mt-2 text-h2">{card.value}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/reviews/identity"
          className="rounded-lg bg-brand-primary px-4 py-2 text-button text-white"
        >
          Open identity reviews
        </Link>
        <Link
          href="/admin/reviews/social"
          className="rounded-lg border border-border-interactive px-4 py-2 text-button"
        >
          Open social reviews
        </Link>
        <Link
          href="/admin/applications"
          className="rounded-lg border border-border-interactive px-4 py-2 text-button"
        >
          Browse applications
        </Link>
      </div>
    </AdminShell>
  );
}
