import { withAdminApi, adminJson } from "@/server/admin/http";
import { listAdminAuditEvents } from "@/server/admin/registration/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminApi(request, "audit:view", async (_session, requestId) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
    const referenceId = url.searchParams.get("referenceId") ?? undefined;
    const result = await listAdminAuditEvents({ page, pageSize, referenceId });
    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
