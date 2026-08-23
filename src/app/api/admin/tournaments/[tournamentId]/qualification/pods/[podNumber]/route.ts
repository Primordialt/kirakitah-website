import { withAdminApi, adminJson } from "@/server/admin/http";
import {
  assignParticipantToPod,
  reassignParticipantToPod,
} from "@/server/tournament/qualification/assignment-service";
import {
  advancePodWinnerToTop32,
  generateQualificationPodMatches,
  getPodMatchDetail,
  recordQualificationMatchResult,
} from "@/server/tournament/qualification/match-engine";
import {
  getPodDetail,
  setPodHostSemifinal,
} from "@/server/tournament/qualification/pod-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string; podNumber: string }> },
) {
  return withAdminApi(request, "tournament:view", async (_session, requestId) => {
    const { tournamentId, podNumber } = await context.params;
    const { getPodByNumber } = await import(
      "@/server/tournament/qualification/pod-service"
    );
    const pod = await getPodByNumber(tournamentId, Number(podNumber));
    if (!pod) {
      return adminJson(
        { error: { code: "NOT_FOUND", message: "Pod not found." } },
        404,
        requestId,
      );
    }

    const detail = await getPodDetail(pod.id);
    const podMatches = await getPodMatchDetail(pod.id);

    return adminJson(
      { success: true, pod: detail?.pod, members: detail?.members, matches: podMatches, requestId },
      200,
      requestId,
    );
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tournamentId: string; podNumber: string }> },
) {
  const { tournamentId, podNumber } = await context.params;
  const body = (await request.json()) as {
    action?: string;
    participantId?: string;
    positionNumber?: number;
    hostSemifinalIndex?: 1 | 2 | null;
    matchId?: string;
    participantAScore?: number;
    participantBScore?: number;
    reason?: string;
  };

  const { getPodByNumber } = await import(
    "@/server/tournament/qualification/pod-service"
  );
  const pod = await getPodByNumber(tournamentId, Number(podNumber));
  if (!pod) {
    return withAdminApi(request, "tournament:view", async (_s, requestId) =>
      adminJson({ error: { code: "NOT_FOUND", message: "Pod not found." } }, 404, requestId),
    );
  }

  if (body.action === "assign") {
    return withAdminApi(request, "tournament:pod_manage", async (session, requestId) => {
      const result = await assignParticipantToPod({
        tournamentId,
        podNumber: Number(podNumber),
        participantId: body.participantId ?? "",
        positionNumber: body.positionNumber ?? 1,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "reassign") {
    return withAdminApi(request, "tournament:pod_manage", async (session, requestId) => {
      const result = await reassignParticipantToPod({
        tournamentId,
        podNumber: Number(podNumber),
        participantId: body.participantId ?? "",
        positionNumber: body.positionNumber ?? 1,
        reason: body.reason ?? "",
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "set_host") {
    return withAdminApi(request, "tournament:pod_manage", async (session, requestId) => {
      const result = await setPodHostSemifinal({
        podId: pod.id,
        hostSemifinalIndex: body.hostSemifinalIndex ?? null,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "generate_matches") {
    return withAdminApi(request, "tournament:match_manage", async (session, requestId) => {
      const result = await generateQualificationPodMatches({
        podId: pod.id,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  if (body.action === "record_result") {
    return withAdminApi(request, "tournament:result_record", async (session, requestId) => {
      const result = await recordQualificationMatchResult({
        matchId: body.matchId ?? "",
        participantAScore: body.participantAScore ?? -1,
        participantBScore: body.participantBScore ?? -1,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, result, requestId }, 200, requestId);
    });
  }

  if (body.action === "advance_top32") {
    return withAdminApi(request, "tournament:phase_manage", async (session, requestId) => {
      const result = await advancePodWinnerToTop32({
        tournamentId,
        podId: pod.id,
        actorId: session.user.id,
        actorRole: session.user.role,
        requestId,
      });
      return adminJson({ success: true, ...result, requestId }, 200, requestId);
    });
  }

  return withAdminApi(request, "tournament:view", async (_s, requestId) =>
    adminJson({ error: { code: "VALIDATION_ERROR", message: "Unknown action." } }, 400, requestId),
  );
}
