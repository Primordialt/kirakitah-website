import { z } from "zod";
import { ADMIN_ROLES } from "@/lib/admin-roles";
import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  getAdminUserById,
  setAdminUserActive,
  updateAdminUserRole,
} from "@/server/admin/users/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  role: z.enum(ADMIN_ROLES).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdminApi(request, "admin:manage", async (_session, requestId) => {
    const { id } = await context.params;
    const admin = await getAdminUserById(id);
    if (!admin) {
      return adminJson(
        apiError("NOT_FOUND", "Administrator not found."),
        404,
        requestId,
      );
    }
    return adminJson({ success: true, admin, requestId }, 200, requestId);
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdminApi(request, "admin:manage", async (session, requestId) => {
    const { id } = await context.params;
    const body = patchSchema.safeParse(await request.json());
    if (!body.success) {
      return adminJson(
        apiError("VALIDATION_ERROR", "Invalid administrator update."),
        400,
        requestId,
      );
    }

    if (body.data.role === undefined && body.data.active === undefined) {
      return adminJson(
        apiError("VALIDATION_ERROR", "No changes requested."),
        400,
        requestId,
      );
    }

    let admin =
      body.data.role !== undefined
        ? await updateAdminUserRole({
            actorId: session.user.id,
            actorRole: session.user.role,
            targetId: id,
            role: body.data.role,
            requestId,
          })
        : await getAdminUserById(id);

    if (!admin) {
      return adminJson(
        apiError("NOT_FOUND", "Administrator not found."),
        404,
        requestId,
      );
    }

    if (body.data.active !== undefined) {
      admin = await setAdminUserActive({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: id,
        active: body.data.active,
        requestId,
      });
    }

    return adminJson({ success: true, admin, requestId }, 200, requestId);
  });
}
