import Link from "next/link";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { listPendingSocialReviews } from "@/server/admin/registration/service";
import { isRegistrationBackendConfigured } from "@/server/env";

export default async function AdminSocialReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("social:review");
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  let result = {
    items: [] as Awaited<ReturnType<typeof listPendingSocialReviews>>["items"],
    page,
    pageSize: 25,
    total: 0,
  };
  let unavailable = false;

  if (isRegistrationBackendConfigured()) {
    try {
      result = await listPendingSocialReviews({ page, pageSize: 25 });
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Pending social reviews</h1>
      <p className="mt-2 text-body text-text-secondary">
        Manual follow verification for X, Instagram, and TikTok. YouTube is not
        required for KG926 until an official channel is published. No automated
        social API.
      </p>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Review queue unavailable in this environment.
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-6 text-body-sm text-text-muted">
          No applications are pending social follow review.
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
                    {item.fullName} · social {item.socialFollowStatus} · submitted{" "}
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
