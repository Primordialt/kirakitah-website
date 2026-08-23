import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { listAdminAuditEvents } from "@/server/admin/registration/service";
import { isRegistrationBackendConfigured } from "@/server/env";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await loadAdminSession("audit:view");
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const referenceId =
    typeof params.referenceId === "string" ? params.referenceId : undefined;

  let result = {
    items: [] as Awaited<ReturnType<typeof listAdminAuditEvents>>["items"],
    page,
    pageSize: 25,
    total: 0,
  };
  let unavailable = false;

  if (isRegistrationBackendConfigured()) {
    try {
      result = await listAdminAuditEvents({ page, pageSize: 25, referenceId });
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">Audit log</h1>
      <p className="mt-2 text-body text-text-secondary">
        Append-only administrative events. Sensitive values are never stored.
      </p>

      <form className="mt-6 flex flex-wrap gap-3">
        <label className="text-body-sm">
          Reference
          <input
            name="referenceId"
            defaultValue={referenceId}
            className="ml-2 h-10 rounded-lg border border-border bg-surface px-3"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-primary px-4 text-button text-white"
        >
          Filter
        </button>
      </form>

      {unavailable ? (
        <p className="mt-6 text-body-sm text-text-muted">
          Audit data unavailable in this environment.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {result.items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-surface-elevated p-4 text-body-sm"
            >
              <p className="font-medium">{item.eventType}</p>
              <p className="mt-1 text-text-muted">
                {new Date(item.createdAt).toLocaleString()} · actor{" "}
                {item.actorId ?? "—"} · role {item.actorRole ?? "—"}
              </p>
              <p className="mt-1 text-text-secondary">
                Application: {item.applicationReference ?? "—"} · request{" "}
                {item.requestId ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
