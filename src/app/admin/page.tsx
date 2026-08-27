import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { getAdminDashboardStats } from "@/server/admin/registration/service";
import { isRegistrationBackendConfigured } from "@/server/env";
import { COMPETITION_NAME, TOURNAMENT_EVENT_ID } from "@/config/competition";

export default async function AdminDashboardPage() {
  const session = await loadAdminSession("dashboard:view");
  const canManageAdmins = roleHasPermission(session.user.role, "admin:manage");
  const canReviewIdentity = roleHasPermission(
    session.user.role,
    "identity:review",
  );
  const canReviewSocial = roleHasPermission(session.user.role, "social:review");
  const canListApplications = roleHasPermission(
    session.user.role,
    "applications:list",
  );
  const canReviewProfiles = roleHasPermission(
    session.user.role,
    "identity:review",
  );

  let stats = {
    totalApplications: 0,
    received: 0,
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

  const attentionItems = [
    canListApplications
      ? {
          label: "Applications under review",
          value: stats.underReview + stats.received,
          href: `/admin/tournaments/${TOURNAMENT_EVENT_ID}/applications?status=under_review`,
        }
      : null,
    canReviewIdentity
      ? {
          label: "Identity reviews pending",
          value: stats.pendingIdentityReviews,
          href: "/admin/reviews/identity",
        }
      : null,
    canReviewSocial
      ? {
          label: "Social reviews pending",
          value: stats.pendingSocialReviews,
          href: "/admin/reviews/social",
        }
      : null,
    canReviewProfiles
      ? {
          label: "Profile reviews",
          value: null as number | null,
          href: "/admin/reviews/profiles",
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: number | null;
    href: string;
  }>;

  const cards = [
    { label: "Total applications", value: stats.totalApplications },
    { label: "Received", value: stats.received },
    { label: "Pending identity reviews", value: stats.pendingIdentityReviews },
    { label: "Pending social reviews", value: stats.pendingSocialReviews },
    { label: "Under review", value: stats.underReview },
    { label: "Verified applications", value: stats.approved },
    { label: "Rejected applications", value: stats.rejected },
  ];

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Registration operations</h1>
      <p className="mt-2 text-body text-text-secondary">
        Internal review workspace for {COMPETITION_NAME} applications.
      </p>

      {!unavailable && attentionItems.length > 0 ? (
        <section
          aria-labelledby="attention-heading"
          className="mt-6 rounded-xl border border-border bg-surface p-5"
        >
          <h2 id="attention-heading" className="text-h3 text-text-primary">
            Needs your attention
          </h2>
          <ul className="mt-4 space-y-3">
            {attentionItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 flex-wrap items-center justify-between gap-2 text-body-sm text-text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <span>{item.label}</span>
                  {item.value !== null ? (
                    <span className="font-semibold">{item.value}</span>
                  ) : (
                    <span className="text-accent">Open</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {canListApplications ? (
            <Link
              href={`/admin/tournaments/${TOURNAMENT_EVENT_ID}/applications`}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-primary px-4 text-button text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              View applications
            </Link>
          ) : null}
        </section>
      ) : null}

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
        {canReviewIdentity ? (
          <Link
            href="/admin/reviews/identity"
            className="rounded-lg bg-brand-primary px-4 py-2 text-button text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Open identity reviews
          </Link>
        ) : null}
        {canReviewSocial ? (
          <Link
            href="/admin/reviews/social"
            className="rounded-lg border border-border-interactive px-4 py-2 text-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Open social reviews
          </Link>
        ) : null}
        <Link
          href="/admin/applications"
          className="rounded-lg border border-border-interactive px-4 py-2 text-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Browse applications
        </Link>
        {canManageAdmins ? (
          <Link
            href="/admin/users"
            className="rounded-lg border border-border-interactive px-4 py-2 text-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Administrators
          </Link>
        ) : null}
      </div>
    </AdminShell>
  );
}
