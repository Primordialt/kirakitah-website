import { ProfileReopenActions } from "@/components/admin/ProfileReopenActions";
import { VerifiedProfilesSearch } from "@/components/admin/VerifiedProfilesSearch";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { getIdentificationTypeLabel } from "@/lib/identification";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { listParticipantProfiles } from "@/server/participant/profile/service";
import { isRegistrationBackendConfigured } from "@/server/env";
import { Suspense } from "react";

export default async function AdminVerifiedProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("identity:review");
  const canReopen = roleHasPermission(session.user.role, "profile:reopen_verified");
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search =
    typeof params.q === "string"
      ? params.q
      : Array.isArray(params.q)
        ? params.q[0] ?? ""
        : "";

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
        status: "verified",
        search,
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
      <h1 className="text-h2">Approved profiles</h1>
      <p className="mt-2 text-body text-text-secondary">
        Verified participant profiles only. Identity numbers are never shown in
        this list.
      </p>

      <Suspense
        fallback={
          <p className="mt-6 text-body-sm text-text-muted">Loading search…</p>
        }
      >
        <VerifiedProfilesSearch initialQuery={search} />
      </Suspense>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Approved profiles are unavailable in this environment.
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-6 text-body-sm text-text-muted">
          {search
            ? "No verified profiles match your search."
            : "No verified profiles yet."}
        </p>
      ) : (
        <>
          <p className="mt-4 text-body-sm text-text-muted">
            Showing {result.items.length} of {result.total} verified profiles
          </p>
          <ul className="mt-4 space-y-4">
            {result.items.map((item) => {
              const fullName =
                [item.firstName, item.lastName].filter(Boolean).join(" ") ||
                item.username;
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-surface-elevated p-4"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-text-primary">{fullName}</p>
                      <p className="text-body-sm text-text-secondary">
                        @{item.username} · {item.email}
                      </p>
                    </div>
                    <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-caption uppercase tracking-wide text-text-muted">
                          Verification status
                        </dt>
                        <dd className="font-medium text-text-primary">Verified</dd>
                      </div>
                      <div>
                        <dt className="text-caption uppercase tracking-wide text-text-muted">
                          Verified on
                        </dt>
                        <dd className="text-text-secondary">
                          {item.verifiedAt
                            ? new Date(item.verifiedAt).toLocaleString()
                            : "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-caption uppercase tracking-wide text-text-muted">
                          Identity document
                        </dt>
                        <dd className="text-text-secondary">
                          {getIdentificationTypeLabel(
                            item.identificationType,
                            item.governmentIdType,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {canReopen ? (
                    <ProfileReopenActions
                      profileId={item.id}
                      participantName={fullName}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AdminShell>
  );
}
