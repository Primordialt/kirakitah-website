import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import {
  APPLICATION_STATUS_FILTERS,
  formatApplicationStatusLabel,
  formatIdentityStatusLabel,
  formatSocialStatusLabel,
} from "@/lib/admin/application-labels";
import {
  getAdminDashboardStats,
  listAdminApplications,
} from "@/server/admin/registration/service";
import { isRegistrationBackendConfigured } from "@/server/env";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import type { ApplicationStatus } from "@/server/admin/registration-repository";
import { COMPETITION_NAME, TOURNAMENT_EVENT_ID } from "@/config/competition";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function ApplicationsQueuePage({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params?: Promise<{ tournamentId?: string }>;
}) {
  const session = await loadAdminSession("applications:list");
  const queryParams = await searchParams;
  const routeParams = params ? await params : undefined;

  const page = Number(queryParams.page ?? "1") || 1;
  const pageSize = Number(queryParams.pageSize ?? "25") || 25;
  const status =
    (queryParams.status as ApplicationStatus | undefined) || undefined;
  const identityStatus =
    typeof queryParams.identityStatus === "string"
      ? queryParams.identityStatus
      : undefined;
  const socialFollowStatus =
    typeof queryParams.socialFollowStatus === "string"
      ? queryParams.socialFollowStatus
      : undefined;
  const referenceId =
    typeof queryParams.referenceId === "string"
      ? queryParams.referenceId
      : undefined;
  const search =
    typeof queryParams.search === "string" ? queryParams.search : undefined;

  const tournamentFromRoute = routeParams?.tournamentId
    ? resolveTournamentId(routeParams.tournamentId)
    : null;
  const eventId =
    tournamentFromRoute ??
    (typeof queryParams.eventId === "string"
      ? resolveTournamentId(queryParams.eventId) ?? queryParams.eventId
      : TOURNAMENT_EVENT_ID);

  let result = {
    items: [] as Awaited<ReturnType<typeof listAdminApplications>>["items"],
    page,
    pageSize,
    total: 0,
  };
  let stats = {
    totalApplications: 0,
    received: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    pendingIdentityReviews: 0,
    pendingSocialReviews: 0,
    pendingContactVerification: 0,
  };
  let unavailable = false;

  if (isRegistrationBackendConfigured()) {
    try {
      [result, stats] = await Promise.all([
        listAdminApplications({
          page,
          pageSize,
          status,
          identityStatus,
          socialFollowStatus,
          referenceId,
          search,
          eventId: eventId || undefined,
          allowPiiSearch: roleHasPermission(session.user.role, "identity:reveal"),
        }),
        getAdminDashboardStats(),
      ]);
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const basePath = tournamentFromRoute
    ? `/admin/tournaments/${tournamentFromRoute}/applications`
    : "/admin/applications";

  const filterDefaults = {
    pageSize: String(pageSize),
    status: status ?? "",
    identityStatus: identityStatus ?? "",
    socialFollowStatus: socialFollowStatus ?? "",
    referenceId: referenceId ?? "",
    search: search ?? "",
    eventId: tournamentFromRoute ? undefined : eventId || undefined,
  };

  return (
    <AdminShell session={session}>
      <header className="space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
          {COMPETITION_NAME}
        </p>
        <h1 className="text-h2 text-text-primary">Applications</h1>
        <p className="text-body text-text-secondary">
          Operational queue for application, identity, and social review.
          Eligibility and selection remain separate stages.
        </p>
      </header>

      {!unavailable ? (
        <section aria-label="Application counts" className="mt-6">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Total", value: stats.totalApplications },
              { label: "Received", value: stats.received },
              { label: "Under review", value: stats.underReview },
              { label: "Verified", value: stats.approved },
              { label: "Rejected", value: stats.rejected },
            ].map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <p className="text-caption uppercase tracking-wide text-text-muted">
                  {item.label}
                </p>
                <p className="mt-1 text-h3 text-text-primary">{item.value}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form
        className="mt-6 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
        method="get"
      >
        {!tournamentFromRoute ? (
          <input type="hidden" name="eventId" value={eventId} />
        ) : null}
        <label className="text-body-sm text-text-primary">
          Reference
          <input
            name="referenceId"
            defaultValue={referenceId}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface-elevated px-3"
            autoComplete="off"
          />
        </label>
        <label className="text-body-sm text-text-primary">
          Search
          <input
            name="search"
            defaultValue={search}
            placeholder="Reference or eFootball username"
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface-elevated px-3"
            autoComplete="off"
          />
        </label>
        <label className="text-body-sm text-text-primary">
          Application status
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface-elevated px-3"
          >
            {APPLICATION_STATUS_FILTERS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-body-sm text-text-primary">
          Identity
          <select
            name="identityStatus"
            defaultValue={identityStatus ?? ""}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface-elevated px-3"
          >
            <option value="">All</option>
            <option value="pending_review">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="text-body-sm text-text-primary">
          Social
          <select
            name="socialFollowStatus"
            defaultValue={socialFollowStatus ?? ""}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface-elevated px-3"
          >
            <option value="">All</option>
            <option value="pending_review">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Requires action</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-brand-primary px-4 text-button text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:w-auto"
          >
            Apply filters
          </button>
        </div>
      </form>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Application data is unavailable in this environment.
        </p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="min-w-full text-left text-body-sm">
              <thead className="border-b border-border text-text-muted">
                <tr>
                  <th className="px-2 py-3">Reference</th>
                  <th className="px-2 py-3">eFootball</th>
                  <th className="px-2 py-3">Applicant</th>
                  <th className="px-2 py-3">Submitted</th>
                  <th className="px-2 py-3">Application</th>
                  <th className="px-2 py-3">Identity</th>
                  <th className="px-2 py-3">Social</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.referenceId} className="border-b border-border/60">
                    <td className="px-2 py-3 font-medium">{item.referenceId}</td>
                    <td className="px-2 py-3">{item.gamerTag}</td>
                    <td className="px-2 py-3">{item.fullName}</td>
                    <td className="px-2 py-3">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-3">
                      {formatApplicationStatusLabel(item.status)}
                    </td>
                    <td className="px-2 py-3">
                      {formatIdentityStatusLabel(item.identityVerificationStatus)}
                    </td>
                    <td className="px-2 py-3">
                      {formatSocialStatusLabel(item.socialFollowStatus)}
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        href={`/admin/applications/${item.referenceId}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-3 lg:hidden">
            {result.items.map((item) => (
              <li
                key={item.referenceId}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <p className="font-medium text-text-primary">
                  {item.referenceId}
                </p>
                <p className="mt-1 text-body-sm text-text-secondary">
                  {item.gamerTag}
                </p>
                <p className="text-body-sm text-text-muted">{item.fullName}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-body-sm">
                  <div>
                    <dt className="text-text-muted">Application</dt>
                    <dd className="font-medium text-text-primary">
                      {formatApplicationStatusLabel(item.status)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Identity</dt>
                    <dd className="font-medium text-text-primary">
                      {formatIdentityStatusLabel(item.identityVerificationStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Social</dt>
                    <dd className="font-medium text-text-primary">
                      {formatSocialStatusLabel(item.socialFollowStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Submitted</dt>
                    <dd className="text-text-primary">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  href={`/admin/applications/${item.referenceId}`}
                >
                  Review application
                </Link>
              </li>
            ))}
          </ul>

          {result.items.length === 0 ? (
            <p className="mt-6 text-body-sm text-text-muted">
              No applications match these filters.
            </p>
          ) : null}

          <nav
            aria-label="Pagination"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 text-body-sm"
          >
            <p>
              Page {result.page} of {totalPages} · {result.total} total
            </p>
            <div className="flex gap-3">
              {result.page > 1 ? (
                <Link
                  href={`${basePath}${buildQuery({
                    ...filterDefaults,
                    page: String(result.page - 1),
                  })}`}
                  className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Previous
                </Link>
              ) : null}
              {result.page < totalPages ? (
                <Link
                  href={`${basePath}${buildQuery({
                    ...filterDefaults,
                    page: String(result.page + 1),
                  })}`}
                  className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </nav>
        </>
      )}
    </AdminShell>
  );
}
