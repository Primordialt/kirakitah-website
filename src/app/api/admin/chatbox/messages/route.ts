import { withAdminApi, adminJson } from "@/server/admin/http";
import { isChatError } from "@/server/chat/errors";
import { postAdminChatMessage } from "@/server/chat/service";
import { validateChatMessageContent } from "@/server/chat/validation";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminApi(request, "chat:announce", async (session, requestId) => {
    const body = (await request.json()) as {
      content?: string;
      replyToMessageId?: string | null;
    };
    if (typeof body.content !== "string") {
      return adminJson(apiError("VALIDATION_ERROR", "content is required."), 400, requestId);
    }
    if (
      body.replyToMessageId != null &&
      typeof body.replyToMessageId !== "string"
    ) {
      return adminJson(apiError("VALIDATION_ERROR", "Invalid reply."), 400, requestId);
    }
    try {
      validateChatMessageContent(body.content);
    } catch {
      return adminJson(apiError("VALIDATION_ERROR", "Write a reply before sending."), 400, requestId);
    }
    try {
      const message = await postAdminChatMessage({
        adminUserId: session.user.id,
        adminRole: session.user.role,
        content: body.content,
        replyToMessageId: body.replyToMessageId ?? null,
        requestId,
      });
      return adminJson({ success: true, message, requestId }, 201, requestId);
    } catch (error) {
      if (isChatError(error)) {
        return adminJson(apiError(error.code, error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to send reply."), 500, requestId);
    }
  });
}
