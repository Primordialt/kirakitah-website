import { withAdminApi, adminJson } from "@/server/admin/http";
import { isChatError } from "@/server/chat/errors";
import { setCommunityLock } from "@/server/chat/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminApi(request, "chat:lock", async (session, requestId) => {
    const body = (await request.json()) as { locked?: boolean };
    if (typeof body.locked !== "boolean") {
      return adminJson(apiError("VALIDATION_ERROR", "locked must be a boolean."), 400, requestId);
    }
    try {
      await setCommunityLock({
        locked: body.locked,
        adminUserId: session.user.id,
        adminRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, locked: body.locked, requestId }, 200, requestId);
    } catch (error) {
      if (isChatError(error)) {
        return adminJson(apiError(error.code, error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to update chat lock."), 500, requestId);
    }
  });
}
