import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { listAdminApplications } from "@/server/admin/registration/service";
import { isRegistrationBackendConfigured } from "@/server/env";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import type { ApplicationStatus } from "@/server/admin/registration-repository";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("applications:list");
  const params = await searchParams;

  const page = Number(params.page ?? "1") || 1;
  const pageSize = Number(params.pageSize ?? "25") || 25;
  const status = (params.status as ApplicationStatus | undefined) || undefined;
  const identityStatus =
    typeof params.identityStatus === "string" ? params.identityStatus : undefined;
  const referenceId =
    typeof params.referenceId === "string" ? params.referenceId : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  let result = {
    items: [] as Awaited<ReturnType<typeof listAdminApplications>>["items"],
    page,
    pageSize,
    total: 0,
  };
  let unavailable = false;

  if (isRegistrationBackendConfigured()) {
    try {
      result = await listAdminApplications({
        page,
        pageSize,
        status,
        identityStatus,
        referenceId,
        search,
        allowPiiSearch: roleHasPermission(session.user.role, "identity:reveal"),
      });
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Applications</h1>
      <p className="mt-2 text-body text-text-secondary">
        Filter and open registration applications for review.
      </p>

      <form className="mt-6 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-4">
        <label className="text-body-sm">
          Reference
          <input
            name="referenceId"
            defaultValue={referenceId}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-elevated px-3"
          />
        </label>
        <label className="text-body-sm">
          Status
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-elevated px-3"
          >
            <option value="">Any</option>
            <option value="received">received</option>
            <option value="under_review">under_review</option>
            <option value="verified">verified</option>
            <option value="rejected">rejected</option>
            <option value="withdrawn">withdrawn</option>
          </select>
        </label>
        <label className="text-body-sm">
          Identity
          <select
            name="identityStatus"
            defaultValue={identityStatus ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-elevated px-3"
          >
            <option value="">Any</option>
            <option value="pending_review">pending_review</option>
            <option value="verified">verified</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <label className="text-body-sm">
          Search
          <input
            name="search"
            defaultValue={search}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-elevated px-3"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-primary px-4 text-button text-white md:col-span-4 md:w-fit"
        >
          Apply filters
        </button>
      </form>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Application data is unavailable in this environment.
        </p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-body-sm">
              <thead className="border-b border-border text-text-muted">
                <tr>
                  <th className="px-2 py-3">Reference</th>
                  <th className="px-2 py-3">Applicant</th>
                  <th className="px-2 py-3">Submitted</th>
                  <th className="px-2 py-3">Email</th>
                  <th className="px-2 py-3">Phone</th>
                  <th className="px-2 py-3">Identity</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.referenceId} className="border-b border-border/60">
                    <td className="px-2 py-3 font-medium">{item.referenceId}</td>
                    <td className="px-2 py-3">{item.fullName}</td>
                    <td className="px-2 py-3">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-3">{item.emailVerificationStatus}</td>
                    <td className="px-2 py-3">{item.phoneVerificationStatus}</td>
                    <td className="px-2 py-3">{item.identityVerificationStatus}</td>
                    <td className="px-2 py-3">{item.status}</td>
                    <td className="px-2 py-3">
                      <Link
                        className="text-accent underline"
                        href={`/admin/applications/${item.referenceId}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {result.items.map((item) => (
              <li
                key={item.referenceId}
                className="rounded-xl border border-border bg-surface-elevated p-4"
              >
                <p className="font-medium">{item.referenceId}</p>
                <p className="text-body-sm text-text-secondary">{item.fullName}</p>
                <p className="mt-2 text-body-sm text-text-muted">
                  Identity: {item.identityVerificationStatus} · Status: {item.status}
                </p>
                <Link
                  className="mt-3 inline-block text-accent underline"
                  href={`/admin/applications/${item.referenceId}`}
                >
                  Open application
                </Link>
              </li>
            ))}
          </ul>

          <nav
            aria-label="Pagination"
            className="mt-6 flex items-center justify-between text-body-sm"
          >
            <p>
              Page {result.page} of {totalPages} · {result.total} total
            </p>
            <div className="flex gap-3">
              {result.page > 1 ? (
                <Link
                  href={`/admin/applications?page=${result.page - 1}&pageSize=${result.pageSize}`}
                  className="underline"
                >
                  Previous
                </Link>
              ) : null}
              {result.page < totalPages ? (
                <Link
                  href={`/admin/applications?page=${result.page + 1}&pageSize=${result.pageSize}`}
                  className="underline"
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
