import { withAdminApi, adminJson } from "@/server/admin/http";
import { getMatchById } from "@/server/tournament/competition/match-service";
import {
  cancelMatchSchedule,
  rescheduleMatch,
  scheduleMatch,
} from "@/server/tournament/scheduling/scheduling-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  return withAdminApi(request, "tournament:match_view", async (_session, requestId) => {
    const { matchId } = await context.params;
    const match = await getMatchById(matchId);
    if (!match) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Match not found." } },
        404,
        requestId,
      );
    }

    return adminJson(
      {
        success: true,
        match: {
          id: match.id,
          tournamentId: match.tournamentId,
          status: match.status,
          schedulingStatus: match.schedulingStatus,
          scheduledAt: match.scheduledAt,
          timezone: match.timezone,
          scheduledWindowStart: match.scheduledWindowStart,
          scheduledWindowEnd: match.scheduledWindowEnd,
          participantAId: match.participantAId,
          participantBId: match.participantBId,
          rulesVersion: match.rulesVersion,
        },
        requestId,
      },
      200,
      requestId,
    );
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await context.params;
  const body = (await request.json()) as {
    action?: string;
    scheduledAt?: string;
    timezone?: string;
    scheduledWindowStart?: string | null;
    scheduledWindowEnd?: string | null;
    reason?: string;
  };

  if (body.action === "schedule") {
    return withAdminApi(request, "tournament:match_schedule", async (session, requestId) => {
      const result = await scheduleMatch({
        matchId,
        scheduledAt: body.scheduledAt ?? "",
        timezone: body.timezone ?? "",
        scheduledWindowStart: body.scheduledWindowStart,
        scheduledWindowEnd: body.scheduledWindowEnd,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "reschedule") {
    return withAdminApi(request, "tournament:match_schedule", async (session, requestId) => {
      const result = await rescheduleMatch({
        matchId,
        scheduledAt: body.scheduledAt ?? "",
        timezone: body.timezone ?? "",
        scheduledWindowStart: body.scheduledWindowStart,
        scheduledWindowEnd: body.scheduledWindowEnd,
        reason: body.reason ?? "",
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "cancel_schedule") {
    return withAdminApi(request, "tournament:match_schedule", async (session, requestId) => {
      const result = await cancelMatchSchedule({
        matchId,
        reason: body.reason ?? "",
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  return withAdminApi(request, "tournament:match_view", async (_s, requestId) =>
    adminJson(
      { error: { code: "VALIDATION_ERROR", message: "Unknown action." } },
      400,
      requestId,
    ),
  );
}
