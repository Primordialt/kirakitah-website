import { withAdminApi, adminJson } from "@/server/admin/http";
import { isChatError } from "@/server/chat/errors";
import { postAdminAnnouncement } from "@/server/chat/service";
import { validateChatMessageContent } from "@/server/chat/validation";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminApi(request, "chat:announce", async (session, requestId) => {
    const body = (await request.json()) as { content?: string };
    if (typeof body.content !== "string") {
      return adminJson(apiError("VALIDATION_ERROR", "content is required."), 400, requestId);
    }
    try {
      validateChatMessageContent(body.content);
    } catch {
      return adminJson(apiError("VALIDATION_ERROR", "Invalid announcement."), 400, requestId);
    }
    try {
      const message = await postAdminAnnouncement({
        adminUserId: session.user.id,
        adminRole: session.user.role,
        content: body.content,
        requestId,
      });
      return adminJson({ success: true, message, requestId }, 201, requestId);
    } catch (error) {
      if (isChatError(error)) {
        return adminJson(apiError(error.code, error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to post announcement."), 500, requestId);
    }
  });
}
