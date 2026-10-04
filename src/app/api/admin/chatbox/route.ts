import { withAdminApi, adminJson } from "@/server/admin/http";
import { isChatError } from "@/server/chat/errors";
import {
  getCommunityRoomStateForAdmin,
  listCommunityMessagesForAdmin,
} from "@/server/chat/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminApi(request, "chat:moderate", async (_session, requestId) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const search = url.searchParams.get("q") ?? undefined;
    const messageType = url.searchParams.get("type") as
      | "user"
      | "announcement"
      | "system"
      | null;
    const mentionsOnly = url.searchParams.get("mentions") === "1";
    const pinnedOnly = url.searchParams.get("pinned") === "1";
    const username = url.searchParams.get("username") ?? undefined;

    try {
      const [room, page] = await Promise.all([
        getCommunityRoomStateForAdmin(),
        listCommunityMessagesForAdmin({
          cursor,
          filters: {
            search,
            messageType: messageType ?? undefined,
            mentionsOnly,
            pinnedOnly,
            username,
          },
        }),
      ]);

      return adminJson(
        {
          success: true,
          room,
          messages: page.messages,
          nextCursor: page.nextCursor,
          requestId,
        },
        200,
        requestId,
      );
    } catch (error) {
      if (isChatError(error)) {
        return adminJson(apiError(error.code, error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to load chat."), 500, requestId);
    }
  });
}
