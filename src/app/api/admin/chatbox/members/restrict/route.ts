import { withAdminApi, adminJson } from "@/server/admin/http";
import { isChatError } from "@/server/chat/errors";
import { lookupParticipantByUsername, restrictMember } from "@/server/chat/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminApi(request, "chat:moderate", async (session, requestId) => {
    const body = (await request.json()) as {
      username?: string;
      status?: "active" | "muted" | "restricted";
      reason?: string | null;
    };
    if (!body.username || typeof body.username !== "string") {
      return adminJson(apiError("VALIDATION_ERROR", "username is required."), 400, requestId);
    }
    if (!body.status || !["active", "muted", "restricted"].includes(body.status)) {
      return adminJson(apiError("VALIDATION_ERROR", "Invalid status."), 400, requestId);
    }

    const participant = await lookupParticipantByUsername(body.username);
    if (!participant) {
      return adminJson(apiError("NOT_FOUND", "Participant not found."), 404, requestId);
    }

    try {
      await restrictMember({
        participantAccountId: participant.id,
        status: body.status,
        reason: body.reason ?? null,
        adminUserId: session.user.id,
        adminRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, requestId }, 200, requestId);
    } catch (error) {
      if (isChatError(error)) {
        return adminJson(apiError(error.code, error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to update member."), 500, requestId);
    }
  });
}
