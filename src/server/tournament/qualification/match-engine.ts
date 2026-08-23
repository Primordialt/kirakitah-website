import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matches,
  matchResults,
  qualificationAutoAdvancements,
  qualificationPodMembers,
  qualificationPods,
  tournamentParticipants,
  tournamentPhaseParticipants,
  tournamentPhases,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import { KG926_COMPETITION_RULES_VERSION } from "@/server/tournament/competition/competition-rules";
import { addParticipantToPhase } from "@/server/tournament/competition/phase-service";
import {
  getPodById,
  getQualificationPhase,
} from "@/server/tournament/qualification/pod-service";

function getMemberByPosition(
  members: Array<{ positionNumber: number; participantId: string }>,
  position: number,
) {
  return members.find((m) => m.positionNumber === position)?.participantId ?? null;
}

export async function listPodMatches(podId: string) {
  const db = getDb();
  return db
    .select()
    .from(matches)
    .where(eq(matches.qualificationPodId, podId))
    .orderBy(matches.qualificationRound, matches.semifinalIndex);
}

async function getMatchWinnerParticipantId(matchId: string): Promise<string | null> {
  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match?.authoritativeResultId) return null;

  const [result] = await db
    .select()
    .from(matchResults)
    .where(eq(matchResults.id, match.authoritativeResultId))
    .limit(1);

  if (!result) return null;
  if (result.outcomeType === "auto_advance") return result.winnerParticipantId;
  if (result.isDraw) return null;
  return result.winnerParticipantId;
}

async function applyHostAutoAdvance(input: {
  podId: string;
  phaseId: string;
  tournamentId: string;
  semifinalIndex: 1 | 2;
  participantId: string;
  matchId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const db = getDb();
  const recordedAt = new Date().toISOString();

  const [existing] = await db
    .select({ id: qualificationAutoAdvancements.id })
    .from(qualificationAutoAdvancements)
    .where(
      and(
        eq(qualificationAutoAdvancements.podId, input.podId),
        eq(qualificationAutoAdvancements.participantId, input.participantId),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(qualificationAutoAdvancements).values({
      podId: input.podId,
      phaseId: input.phaseId,
      participantId: input.participantId,
      semifinalIndex: input.semifinalIndex,
      reason: "HOST_POSITION",
    });
  }

  const [result] = await db
    .insert(matchResults)
    .values({
      matchId: input.matchId,
      participantAScore: 0,
      participantBScore: 0,
      winnerParticipantId: input.participantId,
      isDraw: false,
      isAuthoritative: true,
      resultSource: "admin",
      outcomeType: "auto_advance",
      recordedBy: input.actorId,
      recordedAt,
    })
    .returning({ id: matchResults.id });

  await db
    .update(matches)
    .set({
      status: "completed",
      authoritativeResultId: result.id,
      updatedAt: recordedAt,
    })
    .where(eq(matches.id, input.matchId));

  await recordAdminAuditEvent({
    eventType: "QUALIFICATION_AUTO_ADVANCED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      podId: input.podId,
      participantId: input.participantId,
      semifinalIndex: input.semifinalIndex,
      reason: "HOST_POSITION",
    },
  });

  return input.participantId;
}

async function resolveFinalParticipants(podId: string) {
  const db = getDb();
  const podMatches = await listPodMatches(podId);
  const finalMatch = podMatches.find((m) => m.qualificationRound === "final");
  if (!finalMatch) return;

  const sf1 = podMatches.find(
    (m) => m.qualificationRound === "semifinal" && m.semifinalIndex === 1,
  );
  const sf2 = podMatches.find(
    (m) => m.qualificationRound === "semifinal" && m.semifinalIndex === 2,
  );

  const winnerA = sf1 ? await getMatchWinnerParticipantId(sf1.id) : null;
  const winnerB = sf2 ? await getMatchWinnerParticipantId(sf2.id) : null;

  if (winnerA && winnerB) {
    await db
      .update(matches)
      .set({
        participantAId: winnerA,
        participantBId: winnerB,
        slotAType: "participant",
        slotBType: "participant",
        status: "ready",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(matches.id, finalMatch.id));
  } else if (winnerA || winnerB) {
    await db
      .update(matches)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(matches.id, finalMatch.id));
  }
}

export async function generateQualificationPodMatches(input: {
  podId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{ created: number; alreadyGenerated: boolean }> {
  const pod = await getPodById(input.podId);
  if (!pod) {
    throw new CompetitionOperationsError("Pod not found.", "NOT_FOUND", 404);
  }

  const existing = await listPodMatches(input.podId);
  if (existing.length > 0) {
    return { created: existing.length, alreadyGenerated: true };
  }

  const db = getDb();
  const members = await db
    .select({
      positionNumber: qualificationPodMembers.positionNumber,
      participantId: qualificationPodMembers.participantId,
    })
    .from(qualificationPodMembers)
    .where(eq(qualificationPodMembers.podId, input.podId))
    .orderBy(qualificationPodMembers.positionNumber);

  if (members.length < 2) {
    throw new CompetitionOperationsError(
      "Pod needs at least 2 participants to generate matches.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const hostSf = pod.hostSemifinalIndex as 1 | 2 | null;
  const pos1 = getMemberByPosition(members, 1);
  const pos2 = getMemberByPosition(members, 2);
  const pos3 = getMemberByPosition(members, 3);
  const pos4 = getMemberByPosition(members, 4);

  if (!pos1 || !pos3) {
    throw new CompetitionOperationsError(
      "Positions 1 and 3 are required for bracket generation.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const sf1ParticipantA = pos1;
  const sf1ParticipantB = hostSf === 1 ? null : pos2;
  const sf1SlotBType = hostSf === 1 ? "host" : "participant";

  const sf2ParticipantA = hostSf === 2 ? pos3 : pos3;
  const sf2ParticipantB = hostSf === 2 ? null : pos4;
  const sf2SlotBType = hostSf === 2 ? "host" : "participant";

  if (hostSf !== 1 && !pos2) {
    throw new CompetitionOperationsError(
      "Position 2 required for semifinal 1 without host.",
      "VALIDATION_ERROR",
      400,
    );
  }
  if (hostSf !== 2 && !pos4) {
    throw new CompetitionOperationsError(
      "Position 4 required for semifinal 2 without host.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const [sf1] = await db
    .insert(matches)
    .values({
      tournamentId: pod.tournamentId,
      phaseId: pod.phaseId,
      qualificationPodId: pod.id,
      qualificationRound: "semifinal",
      semifinalIndex: 1,
      slotAType: "participant",
      slotBType: sf1SlotBType,
      participantAId: sf1ParticipantA,
      participantBId: sf1ParticipantB,
      status: hostSf === 1 ? "scheduled" : "ready",
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    })
    .returning({ id: matches.id });

  const [sf2] = await db
    .insert(matches)
    .values({
      tournamentId: pod.tournamentId,
      phaseId: pod.phaseId,
      qualificationPodId: pod.id,
      qualificationRound: "semifinal",
      semifinalIndex: 2,
      slotAType: "participant",
      slotBType: sf2SlotBType,
      participantAId: sf2ParticipantA,
      participantBId: sf2ParticipantB,
      status: hostSf === 2 ? "scheduled" : "ready",
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    })
    .returning({ id: matches.id });

  await db
    .insert(matches)
    .values({
      tournamentId: pod.tournamentId,
      phaseId: pod.phaseId,
      qualificationPodId: pod.id,
      qualificationRound: "final",
      slotAType: "match_winner",
      slotBType: "match_winner",
      dependsOnMatchAId: sf1.id,
      dependsOnMatchBId: sf2.id,
      status: "scheduled",
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    });

  await recordAdminAuditEvent({
    eventType: "QUALIFICATION_MATCH_CREATED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: pod.tournamentId,
      podId: pod.id,
      matchCount: 3,
    },
  });

  if (hostSf === 1 && sf1ParticipantA) {
    await applyHostAutoAdvance({
      podId: pod.id,
      phaseId: pod.phaseId,
      tournamentId: pod.tournamentId,
      semifinalIndex: 1,
      participantId: sf1ParticipantA,
      matchId: sf1.id,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
    });
  }

  if (hostSf === 2 && sf2ParticipantA) {
    await applyHostAutoAdvance({
      podId: pod.id,
      phaseId: pod.phaseId,
      tournamentId: pod.tournamentId,
      semifinalIndex: 2,
      participantId: sf2ParticipantA,
      matchId: sf2.id,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
    });
  }

  await resolveFinalParticipants(pod.id);

  await db
    .update(qualificationPods)
    .set({ status: "active", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(qualificationPods.id, pod.id),
        eq(qualificationPods.status, "ready"),
      ),
    );

  return { created: 3, alreadyGenerated: false };
}

export async function recordQualificationMatchResult(input: {
  matchId: string;
  participantAScore: number;
  participantBScore: number;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  if (
    !Number.isInteger(input.participantAScore) ||
    !Number.isInteger(input.participantBScore) ||
    input.participantAScore < 0 ||
    input.participantBScore < 0
  ) {
    throw new CompetitionOperationsError(
      "Scores must be non-negative integers.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, input.matchId)).limit(1);

  if (!match || !match.qualificationPodId) {
    throw new CompetitionOperationsError("Qualification match not found.", "NOT_FOUND", 404);
  }

  if (match.qualificationRound === "final") {
    if (!match.participantAId || !match.participantBId) {
      throw new CompetitionOperationsError(
        "Final is not ready — semifinal winners unresolved.",
        "VALIDATION_ERROR",
        400,
      );
    }
  }

  if (match.slotBType === "host" || match.slotAType === "host") {
    throw new CompetitionOperationsError(
      "Host matches are resolved via auto-advancement, not manual scores.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (match.authoritativeResultId && match.status === "completed") {
    throw new CompetitionOperationsError(
      "Match already resolved.",
      "CONFLICT",
      409,
    );
  }

  const isDraw = input.participantAScore === input.participantBScore;
  const recordedAt = new Date().toISOString();

  if (isDraw) {
    await db
      .update(matches)
      .set({ status: "requires_resolution", updatedAt: recordedAt })
      .where(eq(matches.id, match.id));

    await db.insert(matchResults).values({
      matchId: match.id,
      participantAScore: input.participantAScore,
      participantBScore: input.participantBScore,
      winnerParticipantId: null,
      isDraw: true,
      isAuthoritative: false,
      resultSource: "admin",
      outcomeType: "requires_resolution",
      recordedBy: input.actorId,
      recordedAt,
    });

    await recordAdminAuditEvent({
      eventType: "QUALIFICATION_MATCH_RESOLVED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      metadata: {
        matchId: match.id,
        podId: match.qualificationPodId,
        requiresResolution: true,
      },
    });

    return {
      matchId: match.id,
      status: "requires_resolution" as const,
      winnerParticipantId: null,
    };
  }

  const winnerId =
    input.participantAScore > input.participantBScore
      ? match.participantAId
      : match.participantBId;

  const [result] = await db
    .insert(matchResults)
    .values({
      matchId: match.id,
      participantAScore: input.participantAScore,
      participantBScore: input.participantBScore,
      winnerParticipantId: winnerId,
      isDraw: false,
      isAuthoritative: true,
      resultSource: "admin",
      outcomeType: "played",
      recordedBy: input.actorId,
      recordedAt,
    })
    .returning({ id: matchResults.id });

  await db
    .update(matches)
    .set({
      status: "completed",
      authoritativeResultId: result.id,
      updatedAt: recordedAt,
    })
    .where(eq(matches.id, match.id));

  await resolveFinalParticipants(match.qualificationPodId);

  if (match.qualificationRound === "final" && winnerId) {
    await completeQualificationPod({
      podId: match.qualificationPodId,
      qualifierParticipantId: winnerId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
    });
  }

  await recordAdminAuditEvent({
    eventType: "QUALIFICATION_MATCH_RESOLVED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      matchId: match.id,
      podId: match.qualificationPodId,
      round: match.qualificationRound ?? "",
      winnerParticipantId: winnerId,
    },
  });

  return {
    matchId: match.id,
    status: "completed" as const,
    winnerParticipantId: winnerId,
  };
}

export async function completeQualificationPod(input: {
  podId: string;
  qualifierParticipantId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const pod = await getPodById(input.podId);
  if (!pod) {
    throw new CompetitionOperationsError("Pod not found.", "NOT_FOUND", 404);
  }

  if (pod.status === "completed" && pod.qualifierParticipantId === input.qualifierParticipantId) {
    return { podId: pod.id, alreadyCompleted: true };
  }

  const db = getDb();
  const now = new Date().toISOString();

  const [updated] = await db
    .update(qualificationPods)
    .set({
      status: "completed",
      qualifierParticipantId: input.qualifierParticipantId,
      updatedAt: now,
    })
    .where(
      and(
        eq(qualificationPods.id, input.podId),
        eq(qualificationPods.status, "active"),
      ),
    )
    .returning({ id: qualificationPods.id });

  if (!updated && pod.status === "completed") {
    return { podId: pod.id, alreadyCompleted: true };
  }

  if (!updated) {
    throw new CompetitionOperationsError(
      "Pod cannot be completed in its current state.",
      "CONFLICT",
      409,
    );
  }

  await recordAdminAuditEvent({
    eventType: "QUALIFICATION_POD_COMPLETED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: pod.tournamentId,
      podId: pod.id,
      podNumber: pod.podNumber,
      qualifierParticipantId: input.qualifierParticipantId,
    },
  });

  return { podId: pod.id, alreadyCompleted: false };
}

export async function advancePodWinnerToTop32(input: {
  tournamentId: string;
  podId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const pod = await getPodById(input.podId);
  if (!pod) {
    throw new CompetitionOperationsError("Pod not found.", "NOT_FOUND", 404);
  }

  if (pod.status !== "completed" || !pod.qualifierParticipantId) {
    throw new CompetitionOperationsError(
      "Pod must be completed with a qualifier before Top 32 advancement.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const [knockoutPhase] = await getDb()
    .select()
    .from(tournamentPhases)
    .where(
      and(
        eq(tournamentPhases.tournamentId, input.tournamentId),
        eq(tournamentPhases.slug, "knockout"),
      ),
    )
    .limit(1);

  if (!knockoutPhase) {
    throw new CompetitionOperationsError("Knockout phase not found.", "NOT_FOUND", 404);
  }

  const [participant] = await getDb()
    .select({ status: tournamentParticipants.status })
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, pod.qualifierParticipantId))
    .limit(1);

  if (!participant || participant.status !== "selected") {
    throw new CompetitionOperationsError(
      "Qualifier is not an active tournament participant.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const result = await addParticipantToPhase({
    phaseId: knockoutPhase.id,
    participantId: pod.qualifierParticipantId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    seed: pod.podNumber,
  });

  const db = getDb();
  await db
    .update(tournamentPhaseParticipants)
    .set({
      status: "qualified",
      qualificationPosition: pod.podNumber,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(tournamentPhaseParticipants.phaseId, pod.phaseId),
        eq(tournamentPhaseParticipants.participantId, pod.qualifierParticipantId),
      ),
    );

  if (!result.alreadyMember) {
    await recordAdminAuditEvent({
      eventType: "QUALIFICATION_TOP32_ADVANCED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      metadata: {
        tournamentId: input.tournamentId,
        podId: pod.id,
        podNumber: pod.podNumber,
        participantId: pod.qualifierParticipantId,
        knockoutPhaseId: knockoutPhase.id,
      },
    });
  }

  return {
    advanced: true,
    alreadyAdvanced: result.alreadyMember,
    knockoutPhaseId: knockoutPhase.id,
    participantId: pod.qualifierParticipantId,
  };
}

export async function advanceAllPodWinnersToTop32(input: {
  tournamentId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const db = getDb();
  const phase = await getQualificationPhase(input.tournamentId);
  const pods = await db
    .select()
    .from(qualificationPods)
    .where(
      and(
        eq(qualificationPods.phaseId, phase.id),
        eq(qualificationPods.status, "completed"),
      ),
    );

  let advanced = 0;
  let skipped = 0;

  for (const pod of pods) {
    if (!pod.qualifierParticipantId) continue;
    const result = await advancePodWinnerToTop32({
      tournamentId: input.tournamentId,
      podId: pod.id,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
    });
    if (result.alreadyAdvanced) skipped += 1;
    else advanced += 1;
  }

  return { advanced, skipped, totalCompletedPods: pods.length };
}

export async function getPodMatchDetail(podId: string) {
  const podMatches = await listPodMatches(podId);
  const db = getDb();

  return Promise.all(
    podMatches.map(async (match) => {
      let slotALabel = match.participantAId ?? "TBD";
      let slotBLabel = match.participantBId ?? "TBD";
      if (match.slotBType === "host") slotBLabel = "HOST";
      if (match.slotAType === "host") slotALabel = "HOST";
      if (match.slotAType === "match_winner") slotALabel = "Winner SF1";
      if (match.slotBType === "match_winner") slotBLabel = "Winner SF2";

      let result = null;
      if (match.authoritativeResultId) {
        const [row] = await db
          .select()
          .from(matchResults)
          .where(eq(matchResults.id, match.authoritativeResultId))
          .limit(1);
        result = row ?? null;
      }

      return {
        ...match,
        slotALabel,
        slotBLabel,
        result,
      };
    }),
  );
}
