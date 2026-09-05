import { z } from "zod";
import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  adminReopenVerifiedProfile,
  ParticipantProfileError,
} from "@/server/participant/profile/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().trim().min(8).max(2000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  return withAdminApi(
    request,
    "profile:reopen_verified",
    async (session, requestId) => {
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
          apiError(
            "VALIDATION_ERROR",
            "A reason of at least 8 characters is required.",
          ),
          400,
          requestId,
        );
      }

      try {
        const profile = await adminReopenVerifiedProfile({
          profileId,
          actorId: session.user.id,
          reason: parsed.data.reason,
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
    },
  );
}
