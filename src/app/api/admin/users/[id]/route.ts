import { z } from "zod";
import { ADMIN_ROLES } from "@/lib/admin-roles";
import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  deleteAdminUser,
  getAdminUserById,
  setAdminUserActive,
  updateAdminUserRole,
  AdminUserManagementError,
} from "@/server/admin/users/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  role: z.enum(ADMIN_ROLES).optional(),
  active: z.boolean().optional(),
});

const deleteSchema = z.object({
  confirmation: z.string().min(1),
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdminApi(request, "admin:manage", async (session, requestId) => {
    const { id } = await context.params;
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
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return adminJson(
        apiError("VALIDATION_ERROR", "Type DELETE to confirm."),
        400,
        requestId,
      );
    }

    try {
      const admin = await deleteAdminUser({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: id,
        confirmation: parsed.data.confirmation,
        requestId,
      });
      return adminJson({ success: true, admin, requestId }, 200, requestId);
    } catch (error) {
      if (error instanceof AdminUserManagementError) {
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
