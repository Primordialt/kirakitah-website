import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  knockoutRounds,
  matches,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  KG926_COMPETITION_RULES_VERSION,
  KG926_FINAL_MATCH_COUNT,
  KG926_KNOCKOUT_MATCH_COUNT,
  KG926_QF_MATCH_COUNT,
  KG926_R16_MATCH_COUNT,
  KG926_R32_MATCH_COUNT,
  KG926_SF_MATCH_COUNT,
} from "@/server/tournament/competition/competition-rules";
import {
  getConfirmedPairingSet,
  listPairingsForSet,
} from "@/server/tournament/knockout/pairing-service";
import {
  getKnockoutPhase,
  validateKnockoutReadiness,
} from "@/server/tournament/knockout/readiness-service";

type RoundType =
  | "round_of_32"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "grand_final";

async function getRoundsByType(phaseId: string) {
  const db = getDb();
  const rounds = await db
    .select()
    .from(knockoutRounds)
    .where(eq(knockoutRounds.phaseId, phaseId));

  const map = new Map(rounds.map((r) => [r.roundType as RoundType, r]));
  for (const required of [
    "round_of_32",
    "round_of_16",
    "quarterfinal",
    "semifinal",
    "grand_final",
  ] as RoundType[]) {
    if (!map.has(required)) {
      throw new CompetitionOperationsError(
        `Missing knockout round: ${required}`,
        "NOT_FOUND",
        404,
      );
    }
  }
  return map;
}

/**
 * Generates the full Top 32 single-elimination bracket from confirmed manual pairings.
 * Creates 16 R32 + 8 R16 + 4 QF + 2 SF + 1 Final = 31 matches with dependency wiring.
 */
export async function generateKnockoutBracket(input: {
  tournamentId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{
  created: number;
  alreadyGenerated: boolean;
  pairingSetId: string;
}> {
  const readiness = await validateKnockoutReadiness(input.tournamentId);
  if (!readiness.ready || !readiness.knockoutPhaseId) {
    throw new CompetitionOperationsError(
      readiness.reasons.join(" ") || "Knockout is not ready.",
      "KNOCKOUT_NOT_READY",
      400,
    );
  }

  const pairingSet = await getConfirmedPairingSet(input.tournamentId);
  if (!pairingSet) {
    throw new CompetitionOperationsError(
      "Round of 32 pairings have not been configured. Confirm 16 manual pairings first.",
      "KNOCKOUT_PAIRINGS_NOT_CONFIGURED",
      400,
    );
  }

  const db = getDb();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);

  if (!tournament) {
    throw new CompetitionOperationsError("Tournament not found.", "NOT_FOUND", 404);
  }

  if (tournament.knockoutBracketStatus !== "not_generated") {
    const existing = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, input.tournamentId),
          eq(matches.phaseId, readiness.knockoutPhaseId),
        ),
      );
    return {
      created: existing.length,
      alreadyGenerated: true,
      pairingSetId: pairingSet.id,
    };
  }

  const phase = await getKnockoutPhase(input.tournamentId);
  if (!phase) {
    throw new CompetitionOperationsError("Knockout phase not found.", "NOT_FOUND", 404);
  }

  const roundMap = await getRoundsByType(phase.id);
  const pairings = await listPairingsForSet(pairingSet.id);
  if (pairings.length !== KG926_R32_MATCH_COUNT) {
    throw new CompetitionOperationsError(
      "Confirmed pairing set is incomplete.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const r32Round = roundMap.get("round_of_32")!;
  const r16Round = roundMap.get("round_of_16")!;
  const qfRound = roundMap.get("quarterfinal")!;
  const sfRound = roundMap.get("semifinal")!;
  const finalRound = roundMap.get("grand_final")!;

  const r32Ids: string[] = [];
  for (const pairing of pairings.sort((a, b) => a.slotIndex - b.slotIndex)) {
    const [row] = await db
      .insert(matches)
      .values({
        tournamentId: input.tournamentId,
        phaseId: phase.id,
        knockoutRoundId: r32Round.id,
        bracketSlotIndex: pairing.slotIndex,
        slotAType: "participant",
        slotBType: "participant",
        participantAId: pairing.participantAId,
        participantBId: pairing.participantBId,
        status: "ready",
        rulesVersion: KG926_COMPETITION_RULES_VERSION,
      })
      .returning({ id: matches.id });
    r32Ids[pairing.slotIndex - 1] = row.id;
  }

  const r16Ids: string[] = [];
  for (let i = 1; i <= KG926_R16_MATCH_COUNT; i += 1) {
    const depA = r32Ids[2 * (i - 1)];
    const depB = r32Ids[2 * (i - 1) + 1];
    const [row] = await db
      .insert(matches)
      .values({
        tournamentId: input.tournamentId,
        phaseId: phase.id,
        knockoutRoundId: r16Round.id,
        bracketSlotIndex: i,
        slotAType: "match_winner",
        slotBType: "match_winner",
        dependsOnMatchAId: depA,
        dependsOnMatchBId: depB,
        status: "scheduled",
        rulesVersion: KG926_COMPETITION_RULES_VERSION,
      })
      .returning({ id: matches.id });
    r16Ids.push(row.id);
  }

  const qfIds: string[] = [];
  for (let i = 1; i <= KG926_QF_MATCH_COUNT; i += 1) {
    const [row] = await db
      .insert(matches)
      .values({
        tournamentId: input.tournamentId,
        phaseId: phase.id,
        knockoutRoundId: qfRound.id,
        bracketSlotIndex: i,
        slotAType: "match_winner",
        slotBType: "match_winner",
        dependsOnMatchAId: r16Ids[2 * (i - 1)],
        dependsOnMatchBId: r16Ids[2 * (i - 1) + 1],
        status: "scheduled",
        rulesVersion: KG926_COMPETITION_RULES_VERSION,
      })
      .returning({ id: matches.id });
    qfIds.push(row.id);
  }

  const sfIds: string[] = [];
  for (let i = 1; i <= KG926_SF_MATCH_COUNT; i += 1) {
    const [row] = await db
      .insert(matches)
      .values({
        tournamentId: input.tournamentId,
        phaseId: phase.id,
        knockoutRoundId: sfRound.id,
        bracketSlotIndex: i,
        slotAType: "match_winner",
        slotBType: "match_winner",
        dependsOnMatchAId: qfIds[2 * (i - 1)],
        dependsOnMatchBId: qfIds[2 * (i - 1) + 1],
        status: "scheduled",
        rulesVersion: KG926_COMPETITION_RULES_VERSION,
      })
      .returning({ id: matches.id });
    sfIds.push(row.id);
  }

  for (let i = 1; i <= KG926_FINAL_MATCH_COUNT; i += 1) {
    await db.insert(matches).values({
      tournamentId: input.tournamentId,
      phaseId: phase.id,
      knockoutRoundId: finalRound.id,
      bracketSlotIndex: i,
      slotAType: "match_winner",
      slotBType: "match_winner",
      dependsOnMatchAId: sfIds[0],
      dependsOnMatchBId: sfIds[1],
      status: "scheduled",
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    });
  }

  const [updated] = await db
    .update(tournaments)
    .set({
      knockoutBracketStatus: "generated",
      status: "knockout",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(tournaments.id, input.tournamentId),
        eq(tournaments.knockoutBracketStatus, "not_generated"),
      ),
    )
    .returning({ id: tournaments.id });

  if (!updated) {
    throw new CompetitionOperationsError(
      "Bracket was generated concurrently.",
      "CONFLICT",
      409,
    );
  }

  await db
    .update(knockoutRounds)
    .set({ status: "active", updatedAt: new Date().toISOString() })
    .where(eq(knockoutRounds.id, r32Round.id));

  await recordAdminAuditEvent({
    eventType: "KNOCKOUT_BRACKET_GENERATED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      pairingSetId: pairingSet.id,
      matchCount: KG926_KNOCKOUT_MATCH_COUNT,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
  });

  await recordAdminAuditEvent({
    eventType: "KNOCKOUT_MATCH_CREATED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      matchCount: KG926_KNOCKOUT_MATCH_COUNT,
    },
  });

  return {
    created: KG926_KNOCKOUT_MATCH_COUNT,
    alreadyGenerated: false,
    pairingSetId: pairingSet.id,
  };
}

export async function listKnockoutBracket(tournamentId: string) {
  const phase = await getKnockoutPhase(tournamentId);
  if (!phase) return { rounds: [] as const };

  const db = getDb();
  const rounds = await db
    .select()
    .from(knockoutRounds)
    .where(eq(knockoutRounds.phaseId, phase.id))
    .orderBy(knockoutRounds.sequence);

  const { matchResults, tournamentParticipants } = await import("@/server/db/schema");

  const result = [];
  for (const round of rounds) {
    const roundMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.knockoutRoundId, round.id))
      .orderBy(matches.bracketSlotIndex);

    const cards = await Promise.all(
      roundMatches.map(async (match) => {
        let participantACode: string | null = null;
        let participantBCode: string | null = null;
        if (match.participantAId) {
          const [a] = await db
            .select({ publicCode: tournamentParticipants.publicCode })
            .from(tournamentParticipants)
            .where(eq(tournamentParticipants.id, match.participantAId))
            .limit(1);
          participantACode = a?.publicCode ?? null;
        }
        if (match.participantBId) {
          const [b] = await db
            .select({ publicCode: tournamentParticipants.publicCode })
            .from(tournamentParticipants)
            .where(eq(tournamentParticipants.id, match.participantBId))
            .limit(1);
          participantBCode = b?.publicCode ?? null;
        }

        let scoreA: number | null = null;
        let scoreB: number | null = null;
        let winnerId: string | null = null;
        if (match.authoritativeResultId) {
          const [res] = await db
            .select()
            .from(matchResults)
            .where(eq(matchResults.id, match.authoritativeResultId))
            .limit(1);
          if (res) {
            scoreA = res.participantAScore;
            scoreB = res.participantBScore;
            winnerId = res.winnerParticipantId;
          }
        }

        return {
          id: match.id,
          slotIndex: match.bracketSlotIndex,
          status: match.status,
          participantAId: match.participantAId,
          participantBId: match.participantBId,
          participantACode,
          participantBCode,
          slotAType: match.slotAType,
          slotBType: match.slotBType,
          dependsOnMatchAId: match.dependsOnMatchAId,
          dependsOnMatchBId: match.dependsOnMatchBId,
          scheduledAt: match.scheduledAt,
          scoreA,
          scoreB,
          winnerParticipantId: winnerId,
          isGrandFinal: round.roundType === "grand_final",
        };
      }),
    );

    result.push({
      id: round.id,
      name: round.name,
      roundType: round.roundType,
      sequence: round.sequence,
      status: round.status,
      matches: cards,
    });
  }

  return { rounds: result };
}
