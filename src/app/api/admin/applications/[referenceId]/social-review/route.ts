import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminApi } from "@/server/admin/http";
import { SOCIAL_PLATFORMS } from "@/config/social";
import { submitSocialFollowReview } from "@/server/registration/social-follow";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ referenceId: string }> },
) {
  return withAdminApi(request, "social:review", async (session, requestId) => {
    const { referenceId } = await context.params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "Invalid social review request."),
        { status: 400 },
      );
    }

    try {
      const result = await submitSocialFollowReview({
        referenceId: referenceId.toUpperCase(),
        platform: parsed.data.platform,
        decision: parsed.data.decision,
        notes: parsed.data.notes,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });

      return NextResponse.json({
        success: true,
        requestId,
        ...result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit social review.";
      return NextResponse.json(apiError("VALIDATION_ERROR", message), {
        status: 400,
      });
    }
  });
}
