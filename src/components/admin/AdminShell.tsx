import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AdminAuthorizationError,
  AdminAuthenticationError,
} from "@/server/admin/authorization/permissions";
import { requireAdminPageSession } from "@/server/admin/auth";
import type { AdminPermission } from "@/server/admin/authorization/permissions";
import type { AdminSession } from "@/server/admin/auth/types";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

export async function loadAdminSession(
  permission?: AdminPermission,
): Promise<AdminSession> {
  try {
    return await requireAdminPageSession(permission);
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      redirect("/admin/login");
    }
    if (error instanceof AdminAuthorizationError) {
      redirect("/admin/forbidden");
    }
    redirect("/admin/login");
  }
}

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-elevated focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-label font-semibold tracking-wide text-text-primary">
              KIRAKITAH Admin
            </p>
            <p className="text-body-sm text-text-muted">
              {session.user.displayName} · {session.user.role}
            </p>
          </div>
          <nav aria-label="Admin" className="flex flex-wrap gap-3 text-body-sm">
            <Link
              className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
              href="/admin"
            >
              Dashboard
            </Link>
            <Link
              className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
              href="/admin/applications"
            >
              Applications
            </Link>
            <Link
              className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
              href="/admin/reviews/identity"
            >
              Identity reviews
            </Link>
            <Link
              className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
              href="/admin/reviews/social"
            >
              Social reviews
            </Link>
            <Link
              className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
              href="/admin/audit"
            >
              Audit
            </Link>
            <Link
              className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
              href="/admin/tournaments"
            >
              Tournaments
            </Link>
            <Link
              className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
              href="/admin/tournaments/participants"
            >
              Participants
            </Link>
            <AdminLogoutButton />
          </nav>
        </div>
      </header>
      <main id="admin-main" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
