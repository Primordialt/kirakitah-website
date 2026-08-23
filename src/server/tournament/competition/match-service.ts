import { and, asc, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matches,
  matchResultCorrections,
  matchResults,
  tournamentParticipants,
  tournamentPhaseParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  isQualificationPairingConfigured,
  parseCompetitionRules,
  KG926_COMPETITION_RULES_VERSION,
} from "@/server/tournament/competition/competition-rules";
import { rebuildQualificationStandings } from "@/server/tournament/competition/standings-service";

function validateScore(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new CompetitionOperationsError(
      `${field} must be a non-negative integer.`,
      "VALIDATION_ERROR",
      400,
    );
  }
  if (value > 999) {
    throw new CompetitionOperationsError(
      `${field} exceeds technical bound.`,
      "VALIDATION_ERROR",
      400,
    );
  }
  return value;
}

async function assertParticipantEligibleForMatch(
  tournamentId: string,
  phaseId: string,
  participantId: string,
) {
  const db = getDb();
  const [participant] = await db
    .select()
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, participantId))
    .limit(1);

  if (!participant || participant.tournamentId !== tournamentId) {
    throw new CompetitionOperationsError(
      "Participant does not belong to this tournament.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (participant.status !== "selected") {
    throw new CompetitionOperationsError(
      "Withdrawn or disqualified participants cannot be assigned matches.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const [membership] = await db
    .select()
    .from(tournamentPhaseParticipants)
    .where(
      and(
        eq(tournamentPhaseParticipants.phaseId, phaseId),
        eq(tournamentPhaseParticipants.participantId, participantId),
      ),
    )
    .limit(1);

  if (!membership || membership.status === "withdrawn" || membership.status === "disqualified") {
    throw new CompetitionOperationsError(
      "Participant is not an active member of this phase.",
      "VALIDATION_ERROR",
      400,
    );
  }

  return participant;
}

export async function createMatch(input: {
  tournamentId: string;
  phaseId: string;
  participantAId: string;
  participantBId: string;
  scheduledAt?: string | null;
  knockoutRoundId?: string | null;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  if (input.participantAId === input.participantBId) {
    throw new CompetitionOperationsError(
      "A match requires two distinct participants.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const db = getDb();
  const [phase] = await db
    .select()
    .from(tournamentPhases)
    .where(eq(tournamentPhases.id, input.phaseId))
    .limit(1);

  if (!phase || phase.tournamentId !== input.tournamentId) {
    throw new CompetitionOperationsError("Phase not found.", "NOT_FOUND", 404);
  }

  if (phase.status !== "scheduled" && phase.status !== "active") {
    throw new CompetitionOperationsError(
      "Matches can only be created when the phase is scheduled or active.",
      "VALIDATION_ERROR",
      400,
    );
  }

  await assertParticipantEligibleForMatch(
    input.tournamentId,
    input.phaseId,
    input.participantAId,
  );
  await assertParticipantEligibleForMatch(
    input.tournamentId,
    input.phaseId,
    input.participantBId,
  );

  const [existing] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.phaseId, input.phaseId),
        eq(matches.status, "scheduled"),
        or(
          and(
            eq(matches.participantAId, input.participantAId),
            eq(matches.participantBId, input.participantBId),
          ),
          and(
            eq(matches.participantAId, input.participantBId),
            eq(matches.participantBId, input.participantAId),
          ),
        ),
      ),
    )
    .limit(1);

  if (existing) {
    return { matchId: existing.id, alreadyExists: true };
  }

  const [row] = await db
    .insert(matches)
    .values({
      tournamentId: input.tournamentId,
      phaseId: input.phaseId,
      knockoutRoundId: input.knockoutRoundId ?? null,
      participantAId: input.participantAId,
      participantBId: input.participantBId,
      scheduledAt: input.scheduledAt ?? null,
      status: "scheduled",
      rulesVersion: phase.rulesVersion || KG926_COMPETITION_RULES_VERSION,
    })
    .returning({ id: matches.id });

  await recordAdminAuditEvent({
    eventType: input.scheduledAt ? "MATCH_SCHEDULED" : "MATCH_CREATED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      phaseId: input.phaseId,
      matchId: row.id,
    },
  });

  return { matchId: row.id, alreadyExists: false };
}

/**
 * Boundary for bulk qualification match creation.
 * Pairing strategy is PENDING PRODUCT DECISION — does not invent schedules.
 */
export async function createQualificationMatches(input: {
  tournamentId: string;
  phaseId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{ code: "QUALIFICATION_RULES_NOT_CONFIGURED"; message: string }> {
  const db = getDb();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);

  if (!tournament) {
    throw new CompetitionOperationsError("Tournament not found.", "NOT_FOUND", 404);
  }

  const rules = parseCompetitionRules(tournament.competitionRules);
  if (!isQualificationPairingConfigured(rules)) {
    return {
      code: "QUALIFICATION_RULES_NOT_CONFIGURED",
      message:
        "Qualification pairing is PENDING PRODUCT DECISION. Automatic match generation is not available.",
    };
  }

  throw new CompetitionOperationsError(
    "Qualification pairing configuration is incomplete.",
    "QUALIFICATION_RULES_NOT_CONFIGURED",
    400,
  );
}

export async function listMatches(options: {
  tournamentId: string;
  phaseId?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = [10, 25, 50].includes(options.pageSize ?? 25)
    ? (options.pageSize ?? 25)
    : 25;
  const offset = (page - 1) * pageSize;

  const where = options.phaseId
    ? and(
        eq(matches.tournamentId, options.tournamentId),
        eq(matches.phaseId, options.phaseId),
      )
    : eq(matches.tournamentId, options.tournamentId);

  const rows = await db
    .select()
    .from(matches)
    .where(where)
    .orderBy(desc(matches.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items: rows, page, pageSize };
}

export async function getMatchById(matchId: string) {
  const db = getDb();
  const [row] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  return row ?? null;
}

export async function recordMatchResult(input: {
  matchId: string;
  participantAScore: number;
  participantBScore: number;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const scoreA = validateScore(input.participantAScore, "participantAScore");
  const scoreB = validateScore(input.participantBScore, "participantBScore");

  const match = await getMatchById(input.matchId);
  if (!match) {
    throw new CompetitionOperationsError("Match not found.", "NOT_FOUND", 404);
  }

  if (match.status === "cancelled") {
    throw new CompetitionOperationsError(
      "Cannot record a result for a cancelled match.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (match.authoritativeResultId && match.status === "completed") {
    throw new CompetitionOperationsError(
      "Match already has an authoritative result. Use correction instead.",
      "CONFLICT",
      409,
    );
  }

  const isDraw = scoreA === scoreB;
  const winnerParticipantId = isDraw
    ? null
    : scoreA > scoreB
      ? match.participantAId
      : match.participantBId;

  const db = getDb();
  const recordedAt = new Date().toISOString();

  const [result] = await db
    .insert(matchResults)
    .values({
      matchId: match.id,
      participantAScore: scoreA,
      participantBScore: scoreB,
      winnerParticipantId,
      isDraw,
      isAuthoritative: true,
      resultSource: "admin",
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
        or(eq(matches.status, "scheduled"), eq(matches.status, "ready"), eq(matches.status, "live"), eq(matches.status, "disputed")),
      ),
    )
    .returning({ id: matches.id });

  if (!updated) {
    throw new CompetitionOperationsError(
      "Match status changed concurrently. Retry.",
      "CONFLICT",
      409,
    );
  }

  await rebuildQualificationStandings(match.phaseId);

  await recordAdminAuditEvent({
    eventType: "MATCH_RESULT_RECORDED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      phaseId: match.phaseId,
      matchId: match.id,
      resultId: result.id,
      isDraw,
    },
  });

  return {
    resultId: result.id,
    winnerParticipantId,
    isDraw,
  };
}

export async function correctMatchResult(input: {
  matchId: string;
  participantAScore: number;
  participantBScore: number;
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const reason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (reason.length < 8) {
    throw new CompetitionOperationsError(
      "Correction reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const scoreA = validateScore(input.participantAScore, "participantAScore");
  const scoreB = validateScore(input.participantBScore, "participantBScore");

  const match = await getMatchById(input.matchId);
  if (!match) {
    throw new CompetitionOperationsError("Match not found.", "NOT_FOUND", 404);
  }

  if (!match.authoritativeResultId) {
    throw new CompetitionOperationsError(
      "No authoritative result to correct.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const db = getDb();
  const [original] = await db
    .select()
    .from(matchResults)
    .where(eq(matchResults.id, match.authoritativeResultId))
    .limit(1);

  if (!original || !original.isAuthoritative) {
    throw new CompetitionOperationsError(
      "Original authoritative result not found.",
      "CONFLICT",
      409,
    );
  }

  const isDraw = scoreA === scoreB;
  const winnerParticipantId = isDraw
    ? null
    : scoreA > scoreB
      ? match.participantAId
      : match.participantBId;

  const recordedAt = new Date().toISOString();

  const [corrected] = await db
    .insert(matchResults)
    .values({
      matchId: match.id,
      participantAScore: scoreA,
      participantBScore: scoreB,
      winnerParticipantId,
      isDraw,
      isAuthoritative: true,
      resultSource: "admin",
      recordedBy: input.actorId,
      recordedAt,
    })
    .returning({ id: matchResults.id });

  await db
    .update(matchResults)
    .set({
      isAuthoritative: false,
      supersededAt: recordedAt,
      supersededByResultId: corrected.id,
    })
    .where(eq(matchResults.id, original.id));

  await db
    .update(matches)
    .set({
      authoritativeResultId: corrected.id,
      status: "completed",
      updatedAt: recordedAt,
    })
    .where(eq(matches.id, match.id));

  await db.insert(matchResultCorrections).values({
    matchId: match.id,
    originalResultId: original.id,
    correctedResultId: corrected.id,
    reason,
    actorId: input.actorId,
  });

  await rebuildQualificationStandings(match.phaseId);

  await recordAdminAuditEvent({
    eventType: "MATCH_RESULT_CORRECTED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      originalResultId: original.id,
      correctedResultId: corrected.id,
      reasonLength: reason.length,
    },
  });

  return {
    originalResultId: original.id,
    correctedResultId: corrected.id,
  };
}

export async function markMatchDisputed(input: {
  matchId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const match = await getMatchById(input.matchId);
  if (!match) {
    throw new CompetitionOperationsError("Match not found.", "NOT_FOUND", 404);
  }

  if (match.status === "cancelled") {
    throw new CompetitionOperationsError(
      "Cancelled matches cannot be disputed.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (match.status === "disputed") {
    return { status: "disputed" as const, alreadyDisputed: true };
  }

  const db = getDb();
  const [updated] = await db
    .update(matches)
    .set({ status: "disputed", updatedAt: new Date().toISOString() })
    .where(eq(matches.id, match.id))
    .returning({ id: matches.id, authoritativeResultId: matches.authoritativeResultId });

  await recordAdminAuditEvent({
    eventType: "MATCH_DISPUTED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      preservedResultId: updated?.authoritativeResultId ?? null,
    },
  });

  return { status: "disputed" as const, alreadyDisputed: false };
}

export async function forfeitMatch(input: {
  matchId: string;
  forfeitingParticipantId: string;
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const reason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (reason.length < 8) {
    throw new CompetitionOperationsError(
      "Forfeit reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const match = await getMatchById(input.matchId);
  if (!match) {
    throw new CompetitionOperationsError("Match not found.", "NOT_FOUND", 404);
  }

  if (
    input.forfeitingParticipantId !== match.participantAId &&
    input.forfeitingParticipantId !== match.participantBId
  ) {
    throw new CompetitionOperationsError(
      "Forfeiting participant must be in the match.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (match.status === "forfeited") {
    return { status: "forfeited" as const, alreadyForfeited: true };
  }

  const winnerParticipantId =
    input.forfeitingParticipantId === match.participantAId
      ? match.participantBId
      : match.participantAId;

  const db = getDb();
  const recordedAt = new Date().toISOString();

  const [result] = await db
    .insert(matchResults)
    .values({
      matchId: match.id,
      participantAScore:
        input.forfeitingParticipantId === match.participantAId ? 0 : 1,
      participantBScore:
        input.forfeitingParticipantId === match.participantBId ? 0 : 1,
      winnerParticipantId,
      isDraw: false,
      isAuthoritative: true,
      resultSource: "admin",
      recordedBy: input.actorId,
      recordedAt,
    })
    .returning({ id: matchResults.id });

  if (match.authoritativeResultId) {
    await db
      .update(matchResults)
      .set({
        isAuthoritative: false,
        supersededAt: recordedAt,
        supersededByResultId: result.id,
      })
      .where(eq(matchResults.id, match.authoritativeResultId));
  }

  await db
    .update(matches)
    .set({
      status: "forfeited",
      authoritativeResultId: result.id,
      updatedAt: recordedAt,
    })
    .where(eq(matches.id, match.id));

  await rebuildQualificationStandings(match.phaseId);

  await recordAdminAuditEvent({
    eventType: "MATCH_FORFEITED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      resultId: result.id,
      reasonLength: reason.length,
    },
  });

  return { status: "forfeited" as const, alreadyForfeited: false, resultId: result.id };
}

export async function getMatchResultHistory(matchId: string) {
  const db = getDb();
  return db
    .select()
    .from(matchResults)
    .where(eq(matchResults.matchId, matchId))
    .orderBy(asc(matchResults.recordedAt));
}
