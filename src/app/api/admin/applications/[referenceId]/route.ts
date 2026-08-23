import { withAdminApi, adminJson } from "@/server/admin/http";
import { getAdminApplicationDetail } from "@/server/admin/registration/service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ referenceId: string }> },
) {
  return withAdminApi(request, "applications:view", async (session, requestId) => {
    const { referenceId } = await context.params;
    const detail = await getAdminApplicationDetail(
      referenceId.toUpperCase(),
      session.user.role,
      { actorId: session.user.id, requestId },
    );

    if (!detail) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Application not found." } },
        404,
        requestId,
      );
    }

    return adminJson({ success: true, application: detail, requestId }, 200, requestId);
  });
}
