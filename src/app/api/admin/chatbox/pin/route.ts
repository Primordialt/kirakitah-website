import { withAdminApi, adminJson } from "@/server/admin/http";
import { isChatError } from "@/server/chat/errors";
import { setPinnedMessage } from "@/server/chat/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminApi(request, "chat:moderate", async (session, requestId) => {
    const body = (await request.json()) as { messageId?: string | null };
    if (body.messageId !== null && typeof body.messageId !== "string") {
      return adminJson(apiError("VALIDATION_ERROR", "messageId must be a string or null."), 400, requestId);
    }
    try {
      await setPinnedMessage({
        messageId: body.messageId ?? null,
        adminUserId: session.user.id,
        adminRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, requestId }, 200, requestId);
    } catch (error) {
      if (isChatError(error)) {
        return adminJson(apiError(error.code, error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to update pin."), 500, requestId);
    }
  });
}
