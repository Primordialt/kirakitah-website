import { z } from "zod";
import { withAdminApi, adminJson } from "@/server/admin/http";
import { changeApplicationStatus } from "@/server/admin/registration/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum(["received", "under_review", "verified", "rejected", "withdrawn"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ referenceId: string }> },
) {
  return withAdminApi(request, "applications:status", async (session, requestId) => {
    const { referenceId } = await context.params;
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return adminJson(
        { error: { code: "VALIDATION_ERROR", message: "Expected JSON body." } },
        400,
        requestId,
      );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return adminJson(
        { error: { code: "VALIDATION_ERROR", message: "Invalid status request." } },
        400,
        requestId,
      );
    }

    const result = await changeApplicationStatus({
      referenceId: referenceId.toUpperCase(),
      status: parsed.data.status,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
