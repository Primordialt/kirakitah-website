import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  knockoutRounds,
  matches,
  matchResults,
  tournamentPhaseParticipants,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import { completeGrandFinalIfReady } from "@/server/tournament/knockout/completion-service";

export async function getMatchWinnerParticipantId(
  matchId: string,
): Promise<string | null> {
  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match?.authoritativeResultId || match.status === "requires_resolution") {
    return null;
  }
  if (match.status === "disputed") return null;

  const [result] = await db
    .select()
    .from(matchResults)
    .where(eq(matchResults.id, match.authoritativeResultId))
    .limit(1);

  if (!result || result.isDraw || !result.isAuthoritative) return null;
  return result.winnerParticipantId;
}

export async function resolveKnockoutMatchReadiness(matchId: string) {
  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) {
    return {
      ready: false,
      reasons: ["Match not found."],
      status: null as string | null,
    };
  }

  const reasons: string[] = [];
  if (match.status === "cancelled") reasons.push("Match is cancelled.");
  if (match.status === "completed" || match.status === "forfeited") {
    return { ready: false, reasons: ["Match already resolved."], status: match.status };
  }
  if (match.status === "disputed") reasons.push("Match is disputed.");
  if (match.status === "requires_resolution") {
    reasons.push("Match requires tie resolution.");
  }

  if (match.dependsOnMatchAId) {
    const winnerA = await getMatchWinnerParticipantId(match.dependsOnMatchAId);
    if (!winnerA) reasons.push("Dependency A winner unresolved.");
  }
  if (match.dependsOnMatchBId) {
    const winnerB = await getMatchWinnerParticipantId(match.dependsOnMatchBId);
    if (!winnerB) reasons.push("Dependency B winner unresolved.");
  }

  if (!match.participantAId || !match.participantBId) {
    reasons.push("Participants not fully resolved.");
  } else if (match.participantAId === match.participantBId) {
    reasons.push("Participants must be distinct.");
  }

  return {
    ready: reasons.length === 0,
    reasons,
    status: match.status,
    participantAId: match.participantAId,
    participantBId: match.participantBId,
  };
}

/**
 * Fills dependent match slots from an authoritative winner and marks match ready.
 */
export async function advanceWinnerToDependentSlots(input: {
  sourceMatchId: string;
  winnerParticipantId: string;
  loserParticipantId: string | null;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const db = getDb();

  const dependents = await db
    .select()
    .from(matches)
    .where(
      or(
        eq(matches.dependsOnMatchAId, input.sourceMatchId),
        eq(matches.dependsOnMatchBId, input.sourceMatchId),
      ),
    );

  for (const dependent of dependents) {
    if (dependent.status === "completed" || dependent.status === "forfeited") {
      throw new CompetitionOperationsError(
        "Downstream match already completed — correction requires explicit administrative resolution.",
        "DOWNSTREAM_CONFLICT",
        409,
      );
    }

    const updates: {
      participantAId?: string;
      participantBId?: string;
      slotAType?: "participant";
      slotBType?: "participant";
      status?: "ready" | "scheduled";
      updatedAt: string;
    } = { updatedAt: new Date().toISOString() };

    if (dependent.dependsOnMatchAId === input.sourceMatchId) {
      updates.participantAId = input.winnerParticipantId;
      updates.slotAType = "participant";
    }
    if (dependent.dependsOnMatchBId === input.sourceMatchId) {
      updates.participantBId = input.winnerParticipantId;
      updates.slotBType = "participant";
    }

    const nextA =
      updates.participantAId ?? dependent.participantAId;
    const nextB =
      updates.participantBId ?? dependent.participantBId;

    if (nextA && nextB && nextA !== nextB) {
      updates.status = "ready";
    }

    await db.update(matches).set(updates).where(eq(matches.id, dependent.id));
  }

  if (input.loserParticipantId) {
    const [source] = await db
      .select({ phaseId: matches.phaseId })
      .from(matches)
      .where(eq(matches.id, input.sourceMatchId))
      .limit(1);

    if (source) {
      await db
        .update(tournamentPhaseParticipants)
        .set({
          status: "eliminated",
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(tournamentPhaseParticipants.phaseId, source.phaseId),
            eq(tournamentPhaseParticipants.participantId, input.loserParticipantId),
          ),
        );
    }
  }
}

export async function evaluateRoundCompletion(input: {
  tournamentId: string;
  knockoutRoundId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const db = getDb();
  const [round] = await db
    .select()
    .from(knockoutRounds)
    .where(eq(knockoutRounds.id, input.knockoutRoundId))
    .limit(1);

  if (!round || round.status === "completed") {
    return { completed: round?.status === "completed", alreadyCompleted: true };
  }

  const roundMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.knockoutRoundId, input.knockoutRoundId));

  if (roundMatches.length === 0) {
    return { completed: false, alreadyCompleted: false };
  }

  const allResolved = roundMatches.every(
    (m) =>
      (m.status === "completed" || m.status === "forfeited") &&
      m.authoritativeResultId != null,
  );

  const anyBlocked = roundMatches.some(
    (m) =>
      m.status === "disputed" ||
      m.status === "requires_resolution" ||
      m.status === "cancelled",
  );

  if (!allResolved || anyBlocked) {
    return { completed: false, alreadyCompleted: false };
  }

  const [updated] = await db
    .update(knockoutRounds)
    .set({ status: "completed", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(knockoutRounds.id, input.knockoutRoundId),
        eq(knockoutRounds.status, "active"),
      ),
    )
    .returning({ id: knockoutRounds.id });

  if (!updated) {
    return { completed: true, alreadyCompleted: true };
  }

  // Activate next round if present
  const [next] = await db
    .select()
    .from(knockoutRounds)
    .where(
      and(
        eq(knockoutRounds.phaseId, round.phaseId),
        eq(knockoutRounds.sequence, round.sequence + 1),
      ),
    )
    .limit(1);

  if (next && next.status === "draft") {
    await db
      .update(knockoutRounds)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(knockoutRounds.id, next.id));
  }

  await recordAdminAuditEvent({
    eventType: "KNOCKOUT_ROUND_COMPLETED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      knockoutRoundId: input.knockoutRoundId,
      roundType: round.roundType,
    },
  });

  if (round.roundType === "grand_final") {
    await completeGrandFinalIfReady({
      tournamentId: input.tournamentId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
    });
  }

  return { completed: true, alreadyCompleted: false };
}

/**
 * Records a knockout match result with draw → requires_resolution and winner progression.
 */
export async function recordKnockoutMatchResult(input: {
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

  if (!match || !match.knockoutRoundId) {
    throw new CompetitionOperationsError(
      "Knockout match not found.",
      "NOT_FOUND",
      404,
    );
  }

  const readiness = await resolveKnockoutMatchReadiness(match.id);
  if (!readiness.ready && match.status !== "disputed") {
    throw new CompetitionOperationsError(
      readiness.reasons.join(" ") || "Match is not ready.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (!match.participantAId || !match.participantBId) {
    throw new CompetitionOperationsError(
      "Cannot record result — participants unresolved.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (match.authoritativeResultId && match.status === "completed") {
    throw new CompetitionOperationsError(
      "Match already resolved. Use correction.",
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
      eventType: "KNOCKOUT_RESULT_RECORDED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      metadata: {
        matchId: match.id,
        requiresResolution: true,
        tournamentId: match.tournamentId,
      },
    });

    throw new CompetitionOperationsError(
      "Draw recorded — MATCH_REQUIRES_RESOLUTION. Tie-break mechanism is PENDING PRODUCT DECISION.",
      "MATCH_REQUIRES_RESOLUTION",
      409,
    );
  }

  const winnerId =
    input.participantAScore > input.participantBScore
      ? match.participantAId
      : match.participantBId;
  const loserId =
    winnerId === match.participantAId ? match.participantBId : match.participantAId;

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

  const [updated] = await db
    .update(matches)
    .set({
      status: "completed",
      authoritativeResultId: result.id,
      updatedAt: recordedAt,
    })
    .where(
      and(
        eq(matches.id, match.id),
        or(
          eq(matches.status, "ready"),
          eq(matches.status, "scheduled"),
          eq(matches.status, "live"),
          eq(matches.status, "disputed"),
          eq(matches.status, "requires_resolution"),
        ),
      ),
    )
    .returning({ id: matches.id });

  if (!updated) {
    throw new CompetitionOperationsError(
      "Match status changed concurrently.",
      "CONFLICT",
      409,
    );
  }

  await advanceWinnerToDependentSlots({
    sourceMatchId: match.id,
    winnerParticipantId: winnerId,
    loserParticipantId: loserId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
  });

  await evaluateRoundCompletion({
    tournamentId: match.tournamentId,
    knockoutRoundId: match.knockoutRoundId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
  });

  await recordAdminAuditEvent({
    eventType: "KNOCKOUT_MATCH_RESOLVED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      winnerParticipantId: winnerId,
      resultId: result.id,
    },
  });

  return {
    resultId: result.id,
    winnerParticipantId: winnerId,
    status: "completed" as const,
  };
}

/**
 * Detects whether a correction would corrupt a progressed downstream bracket.
 */
export async function assertKnockoutCorrectionAllowed(matchId: string) {
  const db = getDb();
  const dependents = await db
    .select()
    .from(matches)
    .where(
      or(eq(matches.dependsOnMatchAId, matchId), eq(matches.dependsOnMatchBId, matchId)),
    );

  for (const dependent of dependents) {
    if (
      dependent.status === "completed" ||
      dependent.status === "forfeited" ||
      dependent.authoritativeResultId
    ) {
      throw new CompetitionOperationsError(
        "Cannot silently correct — downstream match has progressed. Explicit administrative resolution required.",
        "DOWNSTREAM_CONFLICT",
        409,
      );
    }
  }
}
