import { z } from "zod";
import { withAdminApi, adminJson } from "@/server/admin/http";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import {
  bulkApprovalPermissionForQueue,
  executeBulkApproval,
  previewBulkApproval,
  type BulkApprovalQueue,
} from "@/server/admin/registration/bulk-approval";
import { apiError } from "@/server/errors";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";

export const runtime = "nodejs";

const previewSchema = z.object({
  queue: z.enum(["identity_pending", "social_pending"]),
  eventId: z.string().optional(),
});

const executeSchema = previewSchema.extend({
  confirm: z.literal(true),
});

export async function GET(request: Request) {
  return withAdminApi(request, "applications:list", async (session, requestId) => {
    const url = new URL(request.url);
    const parsed = previewSchema.safeParse({
      queue: url.searchParams.get("queue"),
      eventId: url.searchParams.get("eventId") ?? undefined,
    });
    if (!parsed.success) {
      return adminJson(apiError("VALIDATION_ERROR", "Invalid bulk preview."), 400, requestId);
    }

    const permission = bulkApprovalPermissionForQueue(parsed.data.queue);
    if (!roleHasPermission(session.user.role, permission)) {
      return adminJson(apiError("FORBIDDEN", "Missing permission."), 403, requestId);
    }

    const eventId =
      resolveTournamentId(parsed.data.eventId ?? TOURNAMENT_EVENT_ID) ??
      parsed.data.eventId ??
      TOURNAMENT_EVENT_ID;

    const preview = await previewBulkApproval({
      queue: parsed.data.queue,
      eventId,
    });

    return adminJson({ success: true, preview, requestId }, 200, requestId);
  });
}

export async function POST(request: Request) {
  return withAdminApi(request, "applications:list", async (session, requestId) => {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return adminJson(apiError("VALIDATION_ERROR", "Expected JSON body."), 400, requestId);
    }

    const parsed = executeSchema.safeParse(json);
    if (!parsed.success) {
      return adminJson(apiError("VALIDATION_ERROR", "Invalid bulk approval request."), 400, requestId);
    }

    const queue = parsed.data.queue as BulkApprovalQueue;
    const permission = bulkApprovalPermissionForQueue(queue);
    if (!roleHasPermission(session.user.role, permission)) {
      return adminJson(apiError("FORBIDDEN", "Missing permission."), 403, requestId);
    }

    const eventId =
      resolveTournamentId(parsed.data.eventId ?? TOURNAMENT_EVENT_ID) ??
      parsed.data.eventId ??
      TOURNAMENT_EVENT_ID;

    const result = await executeBulkApproval({
      queue,
      eventId,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });

    return adminJson({ success: true, result, requestId }, 200, requestId);
  });
}
