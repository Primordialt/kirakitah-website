import { z } from "zod";
import { withAdminApi, adminJson } from "@/server/admin/http";
import { listParticipantProfiles } from "@/server/participant/profile/service";
import { apiError } from "@/server/errors";
import { isRegistrationBackendConfigured } from "@/server/env";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z
    .enum([
      "incomplete",
      "submitted_for_review",
      "needs_correction",
      "verified",
    ])
    .optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  return withAdminApi(request, "identity:review", async (_session, requestId) => {
    if (!isRegistrationBackendConfigured()) {
      return adminJson(
        apiError(
          "CONFIGURATION_UNAVAILABLE",
          "Participant profiles are not available in this environment.",
        ),
        503,
        requestId,
      );
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("search") ?? url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return adminJson(
        apiError("VALIDATION_ERROR", "Invalid query parameters."),
        400,
        requestId,
      );
    }

    const result = await listParticipantProfiles({
      status: parsed.data.status,
      search: parsed.data.search,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return adminJson(
      {
        success: true,
        items: result.items,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId,
      },
      200,
      requestId,
    );
  });
}
