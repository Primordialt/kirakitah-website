import { ProfileReviewActions } from "@/components/admin/ProfileReviewActions";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { listParticipantProfiles } from "@/server/participant/profile/service";
import { isRegistrationBackendConfigured } from "@/server/env";

export default async function AdminProfileReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("identity:review");
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  let result = {
    items: [] as Awaited<ReturnType<typeof listParticipantProfiles>>["items"],
    page,
    pageSize: 25,
    total: 0,
  };
  let unavailable = false;

  if (isRegistrationBackendConfigured()) {
    try {
      result = await listParticipantProfiles({
        status: "submitted_for_review",
        page,
        pageSize: 25,
      });
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Profile reviews</h1>
      <p className="mt-2 text-body text-text-secondary">
        Participant profiles submitted for verification. Approve or return with a
        public-safe correction reason.
      </p>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Profile review queue unavailable in this environment. Use{" "}
          <code className="text-text-primary">
            GET /api/admin/participant-profiles?status=submitted_for_review
          </code>{" "}
          when configured.
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-6 text-body-sm text-text-muted">
          No profiles are pending review.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {result.items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <div>
                <p className="font-medium">
                  {[item.firstName, item.lastName].filter(Boolean).join(" ") ||
                    item.username}
                </p>
                <p className="text-body-sm text-text-secondary">
                  @{item.username} · {item.email}
                  {item.gamerTag ? ` · eFootball: ${item.gamerTag}` : ""}
                </p>
                <p className="text-body-sm text-text-muted">
                  Submitted{" "}
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleString()
                    : "—"}{" "}
                  · {item.completionPercent}% complete
                </p>
              </div>
              <ProfileReviewActions profileId={item.id} />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
