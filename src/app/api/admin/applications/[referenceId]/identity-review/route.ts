import { z } from "zod";
import { withAdminApi, adminJson } from "@/server/admin/http";
import { submitIdentityReview } from "@/server/admin/registration/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(2000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ referenceId: string }> },
) {
  return withAdminApi(request, "identity:review", async (session, requestId) => {
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
        { error: { code: "VALIDATION_ERROR", message: "Invalid review request." } },
        400,
        requestId,
      );
    }

    const result = await submitIdentityReview({
      referenceId: referenceId.toUpperCase(),
      decision: parsed.data.decision,
      notes: parsed.data.notes,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}
