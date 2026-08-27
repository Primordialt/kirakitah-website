import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { AdminParticipantDeleteActions } from "@/components/admin/AdminParticipantDeleteActions";
import { listParticipantProfiles } from "@/server/participant/profile/service";
import { isRegistrationBackendConfigured } from "@/server/env";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export default async function AdminParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("participant:delete");
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
      <h1 className="text-h2">Participant accounts</h1>
      <p className="mt-2 text-body text-text-secondary">
        SUPER_ADMIN account deletion. Deletion anonymizes personal data and
        preserves tournament integrity. Selected tournament participants cannot
        be deleted until withdrawn or disqualified.
      </p>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Participant account list unavailable in this environment.
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-6 text-body-sm text-text-muted">
          No participant accounts found.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {result.items
            .filter((item) => !item.username.startsWith("deleted_"))
            .map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-text-primary">@{item.username}</p>
                <VerifiedBadge verified={item.status === "verified"} />
              </div>
              <p className="mt-1 text-body-sm text-text-secondary">
                Profile: {item.status} · {item.completionPercent}%
              </p>
              <AdminParticipantDeleteActions
                accountId={item.accountId}
                username={item.username}
              />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
