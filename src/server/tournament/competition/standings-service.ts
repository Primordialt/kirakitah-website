import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matches,
  matchResults,
  qualificationStandings,
  tournamentPhaseParticipants,
} from "@/server/db/schema";

interface StandingAccumulator {
  participantId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

/**
 * Rebuilds materialized qualification standings from authoritative match results.
 *
 * IMPORTANT: Point values (3/1/0) are a technical aggregation placeholder only when
 * competition rules.scoring remains "pending". Ranking/tie-break order for
 * advancement remains PENDING PRODUCT DECISION and must not be treated as final KG926 policy.
 */
export async function rebuildQualificationStandings(phaseId: string): Promise<void> {
  const db = getDb();

  const members = await db
    .select({
      participantId: tournamentPhaseParticipants.participantId,
    })
    .from(tournamentPhaseParticipants)
    .where(eq(tournamentPhaseParticipants.phaseId, phaseId));

  const map = new Map<string, StandingAccumulator>();
  for (const member of members) {
    map.set(member.participantId, {
      participantId: member.participantId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    });
  }

  const completedMatches = await db
    .select({
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      resultId: matches.authoritativeResultId,
      status: matches.status,
      scoreA: matchResults.participantAScore,
      scoreB: matchResults.participantBScore,
      isDraw: matchResults.isDraw,
      winnerId: matchResults.winnerParticipantId,
    })
    .from(matches)
    .innerJoin(matchResults, eq(matches.authoritativeResultId, matchResults.id))
    .where(
      and(
        eq(matches.phaseId, phaseId),
        eq(matchResults.isAuthoritative, true),
      ),
    );

  /** Technical placeholder — NOT approved KG926 scoring policy. */
  const PLACEHOLDER_WIN_POINTS = 3;
  const PLACEHOLDER_DRAW_POINTS = 1;

  for (const match of completedMatches) {
    if (match.status !== "completed" && match.status !== "forfeited") continue;
    if (!match.participantAId || !match.participantBId) continue;

    const a = map.get(match.participantAId);
    const b = map.get(match.participantBId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.goalsFor += match.scoreA;
    a.goalsAgainst += match.scoreB;
    b.goalsFor += match.scoreB;
    b.goalsAgainst += match.scoreA;

    if (match.isDraw) {
      a.draws += 1;
      b.draws += 1;
      a.points += PLACEHOLDER_DRAW_POINTS;
      b.points += PLACEHOLDER_DRAW_POINTS;
    } else if (match.winnerId === match.participantAId) {
      a.wins += 1;
      b.losses += 1;
      a.points += PLACEHOLDER_WIN_POINTS;
    } else if (match.winnerId === match.participantBId) {
      b.wins += 1;
      a.losses += 1;
      b.points += PLACEHOLDER_WIN_POINTS;
    }

    a.goalDifference = a.goalsFor - a.goalsAgainst;
    b.goalDifference = b.goalsFor - b.goalsAgainst;
  }

  const sorted = [...map.values()].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    if (right.goalDifference !== left.goalDifference) {
      return right.goalDifference - left.goalDifference;
    }
    if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
    return left.participantId.localeCompare(right.participantId);
  });

  const rebuiltAt = new Date().toISOString();

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index];
    await db
      .insert(qualificationStandings)
      .values({
        phaseId,
        participantId: row.participantId,
        played: row.played,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        rank: index + 1,
        rebuiltAt,
        updatedAt: rebuiltAt,
      })
      .onConflictDoUpdate({
        target: [
          qualificationStandings.phaseId,
          qualificationStandings.participantId,
        ],
        set: {
          played: row.played,
          wins: row.wins,
          draws: row.draws,
          losses: row.losses,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
          rank: index + 1,
          rebuiltAt,
          updatedAt: rebuiltAt,
        },
      });
  }
}

export async function listQualificationStandings(phaseId: string) {
  const db = getDb();
  return db
    .select()
    .from(qualificationStandings)
    .where(eq(qualificationStandings.phaseId, phaseId))
    .orderBy(asc(qualificationStandings.rank));
}
