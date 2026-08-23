import { withAdminApi, adminJson } from "@/server/admin/http";
import { getAdminDashboardStats } from "@/server/admin/registration/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminApi(request, "dashboard:view", async (_session, requestId) => {
    const stats = await getAdminDashboardStats();
    return adminJson({ success: true, stats, requestId }, 200, requestId);
  });
}
