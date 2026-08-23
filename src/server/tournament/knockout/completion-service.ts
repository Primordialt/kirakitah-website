import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  knockoutRounds,
  matches,
  matchResults,
  tournamentParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import { getKnockoutPhase } from "@/server/tournament/knockout/readiness-service";
import { KG926_COMPETITION_RULES_VERSION } from "@/server/tournament/competition/competition-rules";

/**
 * Completes the tournament when Grand Final has an authoritative winner.
 * Idempotent via conditional update on tournament status.
 */
export async function completeGrandFinalIfReady(input: {
  tournamentId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const db = getDb();
  const phase = await getKnockoutPhase(input.tournamentId);
  if (!phase) {
    throw new CompetitionOperationsError("Knockout phase not found.", "NOT_FOUND", 404);
  }

  const [finalRound] = await db
    .select()
    .from(knockoutRounds)
    .where(
      and(
        eq(knockoutRounds.phaseId, phase.id),
        eq(knockoutRounds.roundType, "grand_final"),
      ),
    )
    .limit(1);

  if (!finalRound) {
    throw new CompetitionOperationsError("Grand Final round not found.", "NOT_FOUND", 404);
  }

  const [finalMatch] = await db
    .select()
    .from(matches)
    .where(eq(matches.knockoutRoundId, finalRound.id))
    .limit(1);

  if (!finalMatch) {
    return { completed: false, reason: "Grand Final match not found." };
  }

  if (finalMatch.status === "disputed" || finalMatch.status === "requires_resolution") {
    return { completed: false, reason: "Grand Final has unresolved dispute or tie." };
  }

  if (
    (finalMatch.status !== "completed" && finalMatch.status !== "forfeited") ||
    !finalMatch.authoritativeResultId
  ) {
    return { completed: false, reason: "Grand Final has no authoritative winner." };
  }

  const [result] = await db
    .select()
    .from(matchResults)
    .where(eq(matchResults.id, finalMatch.authoritativeResultId))
    .limit(1);

  if (!result?.winnerParticipantId || result.isDraw) {
    return { completed: false, reason: "Grand Final winner missing." };
  }

  const championId = result.winnerParticipantId;
  const now = new Date().toISOString();

  const [updated] = await db
    .update(tournaments)
    .set({
      status: "completed",
      championParticipantId: championId,
      knockoutBracketStatus: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(tournaments.id, input.tournamentId),
        eq(tournaments.status, "knockout"),
      ),
    )
    .returning({ id: tournaments.id });

  if (!updated) {
    const [existing] = await db
      .select({
        status: tournaments.status,
        championParticipantId: tournaments.championParticipantId,
      })
      .from(tournaments)
      .where(eq(tournaments.id, input.tournamentId))
      .limit(1);

    if (existing?.status === "completed" && existing.championParticipantId === championId) {
      return {
        completed: true,
        alreadyCompleted: true,
        championParticipantId: championId,
      };
    }

    throw new CompetitionOperationsError(
      "Tournament could not be completed in its current state.",
      "CONFLICT",
      409,
    );
  }

  await db
    .update(knockoutRounds)
    .set({ status: "completed", updatedAt: now })
    .where(eq(knockoutRounds.id, finalRound.id));

  await db
    .update(tournamentPhases)
    .set({ status: "completed", updatedAt: now })
    .where(eq(tournamentPhases.id, phase.id));

  await recordAdminAuditEvent({
    eventType: "CHAMPION_RECORDED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      championParticipantId: championId,
      finalMatchId: finalMatch.id,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
  });

  await recordAdminAuditEvent({
    eventType: "TOURNAMENT_COMPLETED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      championParticipantId: championId,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
  });

  return {
    completed: true,
    alreadyCompleted: false,
    championParticipantId: championId,
  };
}

export async function getChampionPublicProjection(tournamentId: string) {
  const db = getDb();
  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      status: tournaments.status,
      championParticipantId: tournaments.championParticipantId,
      completedAt: tournaments.completedAt,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament?.championParticipantId) {
    return null;
  }

  const [participant] = await db
    .select({ publicCode: tournamentParticipants.publicCode })
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, tournament.championParticipantId))
    .limit(1);

  return {
    tournamentName: tournament.name,
    tournamentStatus: tournament.status,
    championPublicCode: participant?.publicCode ?? null,
    completedAt: tournament.completedAt,
  };
}
