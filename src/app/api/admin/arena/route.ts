import { withAdminApi, adminJson } from "@/server/admin/http";
import { adminListArenas, adminUpdateArena } from "@/server/arena/admin-service";
import { isArenaError } from "@/server/arena/errors";
import { apiError } from "@/server/errors";
import { arenaErrorCode } from "@/server/arena/api-errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminApi(request, "arena:view", async (_session, requestId) => {
    try {
      const arenas = await adminListArenas();
      return adminJson({ success: true, arenas, requestId }, 200, requestId);
    } catch (error) {
      if (isArenaError(error)) {
        return adminJson(apiError(arenaErrorCode(error), error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to load arenas."), 500, requestId);
    }
  });
}

export async function PATCH(request: Request) {
  return withAdminApi(request, "arena:manage", async (session, requestId) => {
    try {
      const body = (await request.json()) as {
        slug?: string;
        enabled?: boolean;
        paused?: boolean;
        entryFeeMilli?: number;
        prizeMilli?: number;
        minUniqueResponders?: number;
        roundDurationSeconds?: number;
        intermissionSeconds?: number;
      };
      if (!body.slug) {
        return adminJson(apiError("VALIDATION_ERROR", "slug required."), 400, requestId);
      }
      await adminUpdateArena({
        slug: body.slug,
        enabled: body.enabled,
        paused: body.paused,
        entryFeeMilli: body.entryFeeMilli,
        prizeMilli: body.prizeMilli,
        minUniqueResponders: body.minUniqueResponders,
        roundDurationSeconds: body.roundDurationSeconds,
        intermissionSeconds: body.intermissionSeconds,
        actorId: session.user.id,
        actorRole: session.user.role,
      });
      return adminJson({ success: true, requestId }, 200, requestId);
    } catch (error) {
      if (isArenaError(error)) {
        return adminJson(apiError(arenaErrorCode(error), error.message), error.status, requestId);
      }
      return adminJson(apiError("INTERNAL_ERROR", "Unable to update arena."), 500, requestId);
    }
  });
}
