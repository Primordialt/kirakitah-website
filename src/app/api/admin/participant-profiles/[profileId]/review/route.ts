import { z } from "zod";
import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  adminApproveProfile,
  adminRequireCorrection,
  ParticipantProfileError,
} from "@/server/participant/profile/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  decision: z.enum(["approve", "needs_correction"]),
  reason: z.string().max(2000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  return withAdminApi(request, "identity:review", async (session, requestId) => {
    const { profileId } = await context.params;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return adminJson(
        apiError("VALIDATION_ERROR", "Expected JSON body."),
        400,
        requestId,
      );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return adminJson(
        apiError("VALIDATION_ERROR", "Invalid review request."),
        400,
        requestId,
      );
    }

    try {
      if (parsed.data.decision === "approve") {
        const profile = await adminApproveProfile({
          profileId,
          actorId: session.user.id,
        });
        return adminJson({ success: true, profile, requestId }, 200, requestId);
      }

      const reason = parsed.data.reason?.trim() ?? "";
      const profile = await adminRequireCorrection({
        profileId,
        actorId: session.user.id,
        reason,
      });
      return adminJson({ success: true, profile, requestId }, 200, requestId);
    } catch (error) {
      if (error instanceof ParticipantProfileError) {
        return adminJson(
          apiError(error.code, error.message),
          error.status,
          requestId,
        );
      }
      throw error;
    }
  });
}
