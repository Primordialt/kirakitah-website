import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  qualificationAutoAdvancements,
  qualificationPodMembers,
  qualificationPods,
  registrationApplications,
  tournamentParticipants,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  KG926_COMPETITION_RULES_VERSION,
  KG926_QUALIFICATION_POD_COUNT,
  KG926_QUALIFICATION_POSITIONS_PER_POD,
} from "@/server/tournament/competition/competition-rules";
import { getPhaseBySlug } from "@/server/tournament/competition/phase-service";

export async function getQualificationPhase(tournamentId: string) {
  const phase = await getPhaseBySlug(tournamentId, "qualification");
  if (!phase) {
    throw new CompetitionOperationsError(
      "Qualification phase not found.",
      "NOT_FOUND",
      404,
    );
  }
  return phase;
}

export async function ensureQualificationPods(tournamentId: string) {
  const phase = await getQualificationPhase(tournamentId);
  const db = getDb();
  const existing = await db
    .select({ podNumber: qualificationPods.podNumber })
    .from(qualificationPods)
    .where(eq(qualificationPods.phaseId, phase.id));

  if (existing.length >= KG926_QUALIFICATION_POD_COUNT) {
    return listQualificationPods(tournamentId);
  }

  const existingNumbers = new Set(existing.map((row) => row.podNumber));
  const toCreate = [];
  for (let n = 1; n <= KG926_QUALIFICATION_POD_COUNT; n += 1) {
    if (!existingNumbers.has(n)) {
      toCreate.push({
        tournamentId,
        phaseId: phase.id,
        podNumber: n,
        status: "draft" as const,
        capacity: KG926_QUALIFICATION_POSITIONS_PER_POD,
        rulesVersion: KG926_COMPETITION_RULES_VERSION,
      });
    }
  }

  if (toCreate.length > 0) {
    await db.insert(qualificationPods).values(toCreate);
  }

  return listQualificationPods(tournamentId);
}

export async function listQualificationPods(tournamentId: string) {
  const phase = await getQualificationPhase(tournamentId);
  const db = getDb();
  return db
    .select()
    .from(qualificationPods)
    .where(eq(qualificationPods.phaseId, phase.id))
    .orderBy(qualificationPods.podNumber);
}

export async function getPodByNumber(tournamentId: string, podNumber: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(qualificationPods)
    .where(
      and(
        eq(qualificationPods.tournamentId, tournamentId),
        eq(qualificationPods.podNumber, podNumber),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPodById(podId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(qualificationPods)
    .where(eq(qualificationPods.id, podId))
    .limit(1);
  return row ?? null;
}

export async function getQualificationDashboard(tournamentId: string) {
  const phase = await getQualificationPhase(tournamentId);
  const db = getDb();
  const pods = await listQualificationPods(tournamentId);

  const [memberCount] = await db
    .select({ value: count() })
    .from(qualificationPodMembers)
    .where(eq(qualificationPodMembers.phaseId, phase.id));

  const completedPods = pods.filter((p) => p.status === "completed").length;
  const qualifiedPods = pods.filter((p) => p.qualifierParticipantId != null).length;
  const filledPods = await Promise.all(
    pods.map(async (pod) => {
      const [row] = await db
        .select({ value: count() })
        .from(qualificationPodMembers)
        .where(eq(qualificationPodMembers.podId, pod.id));
      return Number(row?.value ?? 0) >= pod.capacity;
    }),
  );

  return {
    phaseId: phase.id,
    phaseStatus: phase.status,
    totalParticipants: Number(memberCount?.value ?? 0),
    targetParticipants: 128,
    totalPods: pods.length,
    targetPods: KG926_QUALIFICATION_POD_COUNT,
    podsFilled: filledPods.filter(Boolean).length,
    podsActive: pods.filter((p) => p.status === "active").length,
    podsCompleted: completedPods,
    qualifiersProduced: qualifiedPods,
    targetQualifiers: 32,
    remainingQualifiers: Math.max(0, 32 - qualifiedPods),
  };
}

export async function getPodDetail(podId: string) {
  const pod = await getPodById(podId);
  if (!pod) return null;

  const db = getDb();
  const members = await db
    .select({
      memberId: qualificationPodMembers.id,
      positionNumber: qualificationPodMembers.positionNumber,
      participantId: qualificationPodMembers.participantId,
      publicCode: tournamentParticipants.publicCode,
      gamerTag: registrationApplications.gamerTag,
      participantStatus: tournamentParticipants.status,
    })
    .from(qualificationPodMembers)
    .innerJoin(
      tournamentParticipants,
      eq(qualificationPodMembers.participantId, tournamentParticipants.id),
    )
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(eq(qualificationPodMembers.podId, podId))
    .orderBy(qualificationPodMembers.positionNumber);

  const autoAdvances = await db
    .select()
    .from(qualificationAutoAdvancements)
    .where(eq(qualificationAutoAdvancements.podId, podId));

  return { pod, members, autoAdvances };
}

export async function setPodHostSemifinal(input: {
  podId: string;
  hostSemifinalIndex: 1 | 2 | null;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const pod = await getPodById(input.podId);
  if (!pod) {
    throw new CompetitionOperationsError("Pod not found.", "NOT_FOUND", 404);
  }
  if (pod.status === "completed") {
    throw new CompetitionOperationsError(
      "Cannot change host setting on completed pod.",
      "CONFLICT",
      409,
    );
  }

  const db = getDb();
  await db
    .update(qualificationPods)
    .set({
      hostSemifinalIndex: input.hostSemifinalIndex,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(qualificationPods.id, input.podId));

  return { podId: input.podId, hostSemifinalIndex: input.hostSemifinalIndex };
}

export async function updatePodStatusFromMembers(podId: string) {
  const pod = await getPodById(podId);
  if (!pod || pod.status === "completed" || pod.status === "cancelled") return;

  const db = getDb();
  const [memberRow] = await db
    .select({ value: count() })
    .from(qualificationPodMembers)
    .where(eq(qualificationPodMembers.podId, podId));

  const memberCount = Number(memberRow?.value ?? 0);
  let nextStatus = pod.status;
  if (memberCount >= pod.capacity && pod.status === "draft") {
    nextStatus = "ready";
  } else if (memberCount < pod.capacity && pod.status === "ready") {
    nextStatus = "draft";
  }

  if (nextStatus !== pod.status) {
    await db
      .update(qualificationPods)
      .set({ status: nextStatus, updatedAt: new Date().toISOString() })
      .where(eq(qualificationPods.id, podId));
  }
}

export async function listTop32Qualifiers(tournamentId: string) {
  const phase = await getQualificationPhase(tournamentId);
  const db = getDb();
  return db
    .select({
      podNumber: qualificationPods.podNumber,
      qualifierParticipantId: qualificationPods.qualifierParticipantId,
      publicCode: tournamentParticipants.publicCode,
      gamerTag: registrationApplications.gamerTag,
    })
    .from(qualificationPods)
    .innerJoin(
      tournamentParticipants,
      eq(qualificationPods.qualifierParticipantId, tournamentParticipants.id),
    )
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(
      and(
        eq(qualificationPods.phaseId, phase.id),
        eq(qualificationPods.status, "completed"),
      ),
    )
    .orderBy(qualificationPods.podNumber);
}

export function isQualificationPhaseComplete(
  pods: Array<{ status: string; qualifierParticipantId: string | null }>,
): boolean {
  if (pods.length < KG926_QUALIFICATION_POD_COUNT) return false;
  return pods.every(
    (pod) => pod.status === "completed" && pod.qualifierParticipantId != null,
  );
}
