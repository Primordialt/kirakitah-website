import { withAdminApi, adminJson } from "@/server/admin/http";
import { isChatError } from "@/server/chat/errors";
import { softDeleteMessage } from "@/server/chat/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await context.params;
  return withAdminApi(request, "chat:moderate", async (session, requestId) => {
    try {
      await softDeleteMessage({
        messageId,
        adminUserId: session.user.id,
        adminRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, requestId }, 200, requestId);
    } catch (error) {
      if (isChatError(error)) {
        return adminJson(apiError(error.code, error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to delete message."), 500, requestId);
    }
  });
}
