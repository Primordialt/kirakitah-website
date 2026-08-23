import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  createMatch,
  createQualificationMatches,
  listMatches,
} from "@/server/tournament/competition/match-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:match_view", async (_session, requestId) => {
    const { tournamentId } = await context.params;
    const url = new URL(request.url);
    const phaseId = url.searchParams.get("phaseId") ?? undefined;
    const page = Number(url.searchParams.get("page") ?? "1");
    const result = await listMatches({
      tournamentId,
      phaseId,
      page: Number.isFinite(page) ? page : 1,
    });
    return adminJson({ success: true, ...result, requestId }, 200, requestId);
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  return withAdminApi(request, "tournament:match_manage", async (session, requestId) => {
    const { tournamentId } = await context.params;
    const body = (await request.json()) as {
      action?: "create" | "create_qualification_schedule";
      phaseId?: string;
      participantAId?: string;
      participantBId?: string;
      scheduledAt?: string;
      knockoutRoundId?: string;
    };

    if (body.action === "create_qualification_schedule") {
      if (!body.phaseId) {
        return adminJson(
          { error: { code: "VALIDATION_ERROR", message: "phaseId is required." } },
          400,
          requestId,
        );
      }
      const result = await createQualificationMatches({
        tournamentId,
        phaseId: body.phaseId,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    }

    if (!body.phaseId || !body.participantAId || !body.participantBId) {
      return adminJson(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "phaseId, participantAId, and participantBId are required.",
          },
        },
        400,
        requestId,
      );
    }

    const result = await createMatch({
      tournamentId,
      phaseId: body.phaseId,
      participantAId: body.participantAId,
      participantBId: body.participantBId,
      scheduledAt: body.scheduledAt,
      knockoutRoundId: body.knockoutRoundId,
      actorId: session.user.id,
      actorRole: session.user.role,
      requestId,
    });

    return adminJson(
      { success: true, match: result, requestId },
      result.alreadyExists ? 200 : 201,
      requestId,
    );
  });
}
