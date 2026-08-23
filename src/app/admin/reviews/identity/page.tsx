import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { listPendingIdentityReviews } from "@/server/admin/registration/service";
import { isRegistrationBackendConfigured } from "@/server/env";

export default async function AdminIdentityReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("identity:review");
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  let result = {
    items: [] as Awaited<ReturnType<typeof listPendingIdentityReviews>>["items"],
    page,
    pageSize: 25,
    total: 0,
  };
  let unavailable = false;

  if (isRegistrationBackendConfigured()) {
    try {
      result = await listPendingIdentityReviews({ page, pageSize: 25 });
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Identity reviews</h1>
      <p className="mt-2 text-body text-text-secondary">
        Manual NIN and passport review queue. No automated identity lookup.
      </p>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Review queue unavailable in this environment.
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-6 text-body-sm text-text-muted">
          No applications are pending identity review.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {result.items.map((item) => (
            <li
              key={item.referenceId}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.referenceId}</p>
                  <p className="text-body-sm text-text-secondary">
                    {item.fullName} · submitted{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/admin/applications/${item.referenceId}`}
                  className="rounded-lg bg-brand-primary px-4 py-2 text-button text-white"
                >
                  Review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
