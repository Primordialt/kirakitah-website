import { NextResponse } from "next/server";
import { withAdminApi, adminJson } from "@/server/admin/http";
import { loadPrivatePlayerPhoto } from "@/server/admin/registration/service";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import { requestIdHeaders } from "@/server/security/request-id";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ referenceId: string }> },
) {
  return withAdminApi(request, "photo:view", async (session, requestId) => {
    const { referenceId } = await context.params;
    const photo = await loadPrivatePlayerPhoto(referenceId.toUpperCase());

    if (!photo) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Photo not found." } },
        404,
        requestId,
      );
    }

    await recordAdminAuditEvent({
      eventType: "PLAYER_PHOTO_VIEWED",
      actorId: session.user.id,
      actorRole: session.user.role,
      applicationId: photo.applicationId,
      applicationReference: referenceId.toUpperCase(),
      requestId,
    });

    return new NextResponse(photo.body, {
      status: 200,
      headers: {
        ...API_SECURITY_HEADERS,
        ...requestIdHeaders(requestId),
        "Content-Type": photo.contentType,
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  });
}
