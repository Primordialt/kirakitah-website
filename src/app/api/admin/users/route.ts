import { z } from "zod";
import { ADMIN_ROLES } from "@/lib/admin-roles";
import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  createAdminUser,
  listAdminUsers,
} from "@/server/admin/users/service";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";

const createSchema = z.object({
  displayName: z.string().min(2).max(120),
  email: z.string().email().max(254),
  role: z.enum(ADMIN_ROLES),
  password: z.string().min(12).max(200),
  confirmPassword: z.string().min(12).max(200),
});

export async function GET(request: Request) {
  return withAdminApi(request, "admin:manage", async (_session, requestId) => {
    const url = new URL(request.url);
    const activeParam = url.searchParams.get("active");
    const active =
      activeParam === "true"
        ? true
        : activeParam === "false"
          ? false
          : undefined;

    const result = await listAdminUsers({
      query: url.searchParams.get("q") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      active,
      page: Number(url.searchParams.get("page") ?? "1") || 1,
      pageSize: Number(url.searchParams.get("pageSize") ?? "25") || 25,
    });

    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}

export async function POST(request: Request) {
  return withAdminApi(request, "admin:manage", async (session, requestId) => {
    const body = createSchema.safeParse(await request.json());
    if (!body.success) {
      return adminJson(
        apiError("VALIDATION_ERROR", "Invalid administrator payload."),
        400,
        requestId,
      );
    }

    if (body.data.password !== body.data.confirmPassword) {
      return adminJson(
        apiError("VALIDATION_ERROR", "Password confirmation does not match."),
        400,
        requestId,
      );
    }

    const created = await createAdminUser({
      actorId: session.user.id,
      actorRole: session.user.role,
      displayName: body.data.displayName,
      email: body.data.email,
      role: body.data.role,
      password: body.data.password,
      requestId,
    });

    return adminJson(
      { success: true, admin: created, requestId },
      201,
      requestId,
    );
  });
}
