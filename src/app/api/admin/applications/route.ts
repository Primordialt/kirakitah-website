import { withAdminApi, adminJson } from "@/server/admin/http";
import { listAdminApplications } from "@/server/admin/registration/service";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import type { ApplicationStatus } from "@/server/admin/registration-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminApi(request, "applications:list", async (session, requestId) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
    const status = url.searchParams.get("status") as ApplicationStatus | null;
    const identityStatus = url.searchParams.get("identityStatus") ?? undefined;
    const emailVerificationStatus =
      url.searchParams.get("emailVerificationStatus") ?? undefined;
    const phoneVerificationStatus =
      url.searchParams.get("phoneVerificationStatus") ?? undefined;
    const eventId = url.searchParams.get("eventId") ?? undefined;
    const referenceId = url.searchParams.get("referenceId") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;

    const result = await listAdminApplications({
      page,
      pageSize,
      status: status ?? undefined,
      identityStatus,
      emailVerificationStatus,
      phoneVerificationStatus,
      eventId,
      referenceId,
      search,
      allowPiiSearch: roleHasPermission(session.user.role, "identity:reveal"),
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
