import { withAdminApi, adminJson } from "@/server/admin/http";
import { revealAdminSensitiveIdentity } from "@/server/admin/registration/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ referenceId: string }> },
) {
  return withAdminApi(request, "identity:reveal", async (session, requestId) => {
    const { referenceId } = await context.params;
    const identity = await revealAdminSensitiveIdentity(
      referenceId.toUpperCase(),
      session.user.role,
      { actorId: session.user.id, requestId },
    );

    if (!identity) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Application not found." } },
        404,
        requestId,
      );
    }

    return adminJson({ success: true, identity, requestId }, 200, requestId);
  });
}
