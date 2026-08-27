import { z } from "zod";
import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  deleteParticipantAccount,
  ParticipantAccountDeletionError,
} from "@/server/participant/account-deletion";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

const schema = z.object({
  confirmation: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  return withAdminApi(request, "participant:delete", async (session, requestId) => {
    const { accountId } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return adminJson(
        apiError("VALIDATION_ERROR", "Invalid JSON body."),
        400,
        requestId,
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return adminJson(
        apiError("VALIDATION_ERROR", "Type DELETE to confirm."),
        400,
        requestId,
      );
    }

    try {
      await deleteParticipantAccount({
        accountId,
        actor: session.user.id,
        actorType: "admin",
        confirmation: parsed.data.confirmation,
      });
      return adminJson(
        {
          success: true,
          message: "Participant account deleted.",
          requestId,
        },
        200,
        requestId,
      );
    } catch (error) {
      if (error instanceof ParticipantAccountDeletionError) {
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
