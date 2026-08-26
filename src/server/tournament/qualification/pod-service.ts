import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  eligibilityEvaluations,
  matches,
  qualificationAutoAdvancements,
  qualificationPodMembers,
  qualificationPods,
  registrationApplications,
  tournamentParticipants,
  tournamentPhaseParticipants,
  tournamentPhases,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  KG926_COMPETITION_RULES_VERSION,
  KG926_QUALIFICATION_ENTRANTS,
  KG926_QUALIFICATION_POD_COUNT,
  KG926_QUALIFICATION_POSITIONS_PER_POD,
  KG926_QUALIFICATION_TARGET,
} from "@/server/tournament/competition/competition-rules";
import { getPhaseBySlug } from "@/server/tournament/competition/phase-service";
import { getParticipantCount } from "@/server/tournament/participant-service";

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

  const selectedParticipants = await getParticipantCount(tournamentId);
  const assignedParticipants = Number(memberCount?.value ?? 0);
  const completedPods = pods.filter((p) => p.status === "completed").length;
  const qualifiedPods = pods.filter((p) => p.qualifierParticipantId != null).length;
  const podsReady = pods.filter((p) => p.status === "ready").length;
  const podsActive = pods.filter((p) => p.status === "active").length;

  const filledPods = await Promise.all(
    pods.map(async (pod) => {
      const [row] = await db
        .select({ value: count() })
        .from(qualificationPodMembers)
        .where(eq(qualificationPodMembers.podId, pod.id));
      return Number(row?.value ?? 0) >= pod.capacity;
    }),
  );

  const [matchGeneratedRow] = await db
    .select({ value: count() })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.phaseId, phase.id),
        isNotNull(matches.qualificationPodId),
      ),
    );

  const [matchCompletedRow] = await db
    .select({ value: count() })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.phaseId, phase.id),
        isNotNull(matches.qualificationPodId),
        eq(matches.status, "completed"),
      ),
    );

  const [knockoutPhase] = await db
    .select({ id: tournamentPhases.id })
    .from(tournamentPhases)
    .where(
      and(
        eq(tournamentPhases.tournamentId, tournamentId),
        eq(tournamentPhases.slug, "knockout"),
      ),
    )
    .limit(1);

  let top32Advanced = 0;
  if (knockoutPhase) {
    const [advancedRow] = await db
      .select({ value: count() })
      .from(tournamentPhaseParticipants)
      .where(eq(tournamentPhaseParticipants.phaseId, knockoutPhase.id));
    top32Advanced = Number(advancedRow?.value ?? 0);
  }

  const totalPodCapacity = pods.reduce((sum, pod) => sum + pod.capacity, 0);

  return {
    phaseId: phase.id,
    phaseStatus: phase.status,
    selectedParticipants,
    selectedParticipantsTarget: KG926_QUALIFICATION_ENTRANTS,
    participantsAssigned: assignedParticipants,
    participantsUnassigned: Math.max(0, selectedParticipants - assignedParticipants),
    totalPodCapacity,
    totalPodCapacityTarget: KG926_QUALIFICATION_ENTRANTS,
    /** @deprecated Prefer participantsAssigned — kept for existing UI */
    totalParticipants: assignedParticipants,
    targetParticipants: KG926_QUALIFICATION_ENTRANTS,
    totalPods: pods.length,
    targetPods: KG926_QUALIFICATION_POD_COUNT,
    podsReady,
    podsFilled: filledPods.filter(Boolean).length,
    podsActive,
    podsCompleted: completedPods,
    matchesGenerated: Number(matchGeneratedRow?.value ?? 0),
    matchesCompleted: Number(matchCompletedRow?.value ?? 0),
    qualifiersProduced: qualifiedPods,
    targetQualifiers: KG926_QUALIFICATION_TARGET,
    remainingQualifiers: Math.max(0, KG926_QUALIFICATION_TARGET - qualifiedPods),
    top32Advanced,
    top32Target: KG926_QUALIFICATION_TARGET,
  };
}

export type QualificationPodSummary = {
  id: string;
  podNumber: number;
  status: string;
  capacity: number;
  memberCount: number;
  hostConfigured: boolean;
  hostSemifinalIndex: number | null;
  matchesGenerated: number;
  matchesCompleted: number;
  qualifierPublicCode: string | null;
  readinessReason: string;
};

export function explainPodReadiness(input: {
  status: string;
  capacity: number;
  memberCount: number;
  hostSemifinalIndex: number | null;
  matchesGenerated: number;
  qualifierPublicCode: string | null;
}): string {
  if (input.status === "completed") {
    return input.qualifierPublicCode
      ? `Qualifier determined (${input.qualifierPublicCode}).`
      : "Pod completed.";
  }
  if (input.status === "cancelled") {
    return "Pod cancelled.";
  }
  if (input.status === "active") {
    return input.matchesGenerated > 0
      ? "Matches in progress."
      : "Pod active — generate or continue matches.";
  }
  if (input.status === "ready") {
    return "Ready for match generation (4/4 participants assigned).";
  }
  if (input.memberCount < input.capacity) {
    return `${input.memberCount} of ${input.capacity} participant positions filled.`;
  }
  if (input.hostSemifinalIndex) {
    return `Host configured on semifinal ${input.hostSemifinalIndex}. Assign remaining participants if required.`;
  }
  return "Not ready for match generation.";
}

export async function listQualificationPodSummaries(
  tournamentId: string,
): Promise<QualificationPodSummary[]> {
  const pods = await listQualificationPods(tournamentId);
  if (pods.length === 0) return [];

  const db = getDb();
  const podIds = pods.map((pod) => pod.id);

  const memberRows = await db
    .select({
      podId: qualificationPodMembers.podId,
      value: count(),
    })
    .from(qualificationPodMembers)
    .where(inArray(qualificationPodMembers.podId, podIds))
    .groupBy(qualificationPodMembers.podId);

  const memberMap = new Map(
    memberRows.map((row) => [row.podId, Number(row.value)]),
  );

  const matchRows = await db
    .select({
      podId: matches.qualificationPodId,
      status: matches.status,
    })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        inArray(matches.qualificationPodId, podIds),
      ),
    );

  const matchMap = new Map<string, { generated: number; completed: number }>();
  for (const row of matchRows) {
    if (!row.podId) continue;
    const current = matchMap.get(row.podId) ?? { generated: 0, completed: 0 };
    current.generated += 1;
    if (row.status === "completed") current.completed += 1;
    matchMap.set(row.podId, current);
  }

  const qualifierIds = pods
    .map((pod) => pod.qualifierParticipantId)
    .filter((id): id is string => Boolean(id));

  const qualifierCodeMap = new Map<string, string>();
  if (qualifierIds.length > 0) {
    const codes = await db
      .select({
        id: tournamentParticipants.id,
        publicCode: tournamentParticipants.publicCode,
      })
      .from(tournamentParticipants)
      .where(inArray(tournamentParticipants.id, qualifierIds));
    for (const row of codes) {
      if (row.publicCode) qualifierCodeMap.set(row.id, row.publicCode);
    }
  }

  return pods.map((pod) => {
    const memberCount = memberMap.get(pod.id) ?? 0;
    const matchStats = matchMap.get(pod.id) ?? { generated: 0, completed: 0 };
    const qualifierPublicCode = pod.qualifierParticipantId
      ? (qualifierCodeMap.get(pod.qualifierParticipantId) ?? null)
      : null;
    return {
      id: pod.id,
      podNumber: pod.podNumber,
      status: pod.status,
      capacity: pod.capacity,
      memberCount,
      hostConfigured: pod.hostSemifinalIndex != null,
      hostSemifinalIndex: pod.hostSemifinalIndex,
      matchesGenerated: matchStats.generated,
      matchesCompleted: matchStats.completed,
      qualifierPublicCode,
      readinessReason: explainPodReadiness({
        status: pod.status,
        capacity: pod.capacity,
        memberCount,
        hostSemifinalIndex: pod.hostSemifinalIndex,
        matchesGenerated: matchStats.generated,
        qualifierPublicCode,
      }),
    };
  });
}

/** Safe roster for qualification ops — public codes and gamer tags only. */
export async function listQualificationParticipantRoster(tournamentId: string) {
  const phase = await getQualificationPhase(tournamentId);
  const db = getDb();

  const participants = await db
    .select({
      participantId: tournamentParticipants.id,
      publicCode: tournamentParticipants.publicCode,
      status: tournamentParticipants.status,
      gamerTag: registrationApplications.gamerTag,
      eligible: eligibilityEvaluations.eligible,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .innerJoin(
      eligibilityEvaluations,
      eq(tournamentParticipants.eligibilityEvaluationId, eligibilityEvaluations.id),
    )
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.status, "selected"),
      ),
    )
    .orderBy(tournamentParticipants.publicCode);

  const assignments = await db
    .select({
      participantId: qualificationPodMembers.participantId,
      podNumber: qualificationPods.podNumber,
      positionNumber: qualificationPodMembers.positionNumber,
    })
    .from(qualificationPodMembers)
    .innerJoin(
      qualificationPods,
      eq(qualificationPodMembers.podId, qualificationPods.id),
    )
    .where(eq(qualificationPodMembers.phaseId, phase.id));

  const assignmentMap = new Map(
    assignments.map((row) => [
      row.participantId,
      { podNumber: row.podNumber, positionNumber: row.positionNumber },
    ]),
  );

  return participants.map((row) => {
    const assignment = assignmentMap.get(row.participantId);
    return {
      participantId: row.participantId,
      publicCode: row.publicCode,
      gamerTag: row.gamerTag,
      status: row.status,
      eligible: row.eligible,
      podNumber: assignment?.podNumber ?? null,
      positionNumber: assignment?.positionNumber ?? null,
    };
  });
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

  const rows = await db
    .select({
      podNumber: qualificationPods.podNumber,
      qualifierParticipantId: qualificationPods.qualifierParticipantId,
      publicCode: tournamentParticipants.publicCode,
      gamerTag: registrationApplications.gamerTag,
      eligible: eligibilityEvaluations.eligible,
      participantStatus: tournamentParticipants.status,
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
    .innerJoin(
      eligibilityEvaluations,
      eq(tournamentParticipants.eligibilityEvaluationId, eligibilityEvaluations.id),
    )
    .where(
      and(
        eq(qualificationPods.phaseId, phase.id),
        eq(qualificationPods.status, "completed"),
      ),
    )
    .orderBy(qualificationPods.podNumber);

  const [knockoutPhase] = await db
    .select({ id: tournamentPhases.id })
    .from(tournamentPhases)
    .where(
      and(
        eq(tournamentPhases.tournamentId, tournamentId),
        eq(tournamentPhases.slug, "knockout"),
      ),
    )
    .limit(1);

  const advancedIds = new Set<string>();
  if (knockoutPhase && rows.length > 0) {
    const advanced = await db
      .select({ participantId: tournamentPhaseParticipants.participantId })
      .from(tournamentPhaseParticipants)
      .where(
        and(
          eq(tournamentPhaseParticipants.phaseId, knockoutPhase.id),
          inArray(
            tournamentPhaseParticipants.participantId,
            rows.map((row) => row.qualifierParticipantId as string),
          ),
        ),
      );
    for (const row of advanced) {
      advancedIds.add(row.participantId);
    }
  }

  return rows.map((row) => ({
    seed: row.podNumber,
    podNumber: row.podNumber,
    qualifierParticipantId: row.qualifierParticipantId,
    publicCode: row.publicCode,
    gamerTag: row.gamerTag,
    eligible: row.eligible,
    participantStatus: row.participantStatus,
    advancedToTop32: row.qualifierParticipantId
      ? advancedIds.has(row.qualifierParticipantId)
      : false,
  }));
}

export function isQualificationPhaseComplete(
  pods: Array<{ status: string; qualifierParticipantId: string | null }>,
): boolean {
  if (pods.length < KG926_QUALIFICATION_POD_COUNT) return false;
  return pods.every(
    (pod) => pod.status === "completed" && pod.qualifierParticipantId != null,
  );
}
