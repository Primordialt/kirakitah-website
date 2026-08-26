import { and, asc, eq, gte, isNotNull, ne } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matches,
  qualificationPods,
  registrationApplications,
  tournamentParticipants,
  tournamentPhases,
} from "@/server/db/schema";
import {
  formatInTimezone,
  formatTimezoneLabel,
  TOURNAMENT_DEFAULT_TIMEZONE,
} from "@/server/tournament/scheduling/timezone";
import { assertNoSensitivePublicFields } from "@/server/tournament/competition/public-projections";

export type PlayerSafeMatchProjection = {
  matchId: string;
  phase: string;
  podNumber: number | null;
  roundLabel: string;
  yourPublicCode: string | null;
  yourGamerTag: string;
  opponentPublicCode: string | null;
  opponentGamerTag: string | null;
  scheduledAt: string | null;
  scheduledDisplay: string;
  timezone: string;
  timezoneLabel: string;
  matchStatus: string;
  schedulingStatus: string;
};

/**
 * Privacy-safe match projection for a participant.
 * Authenticated participant access is deferred — do not invent weak auth.
 */
export async function getPlayerSafeUpcomingMatch(input: {
  tournamentId: string;
  participantId: string;
}): Promise<PlayerSafeMatchProjection | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const candidates = await db
    .select({
      matchId: matches.id,
      phaseName: tournamentPhases.name,
      podNumber: qualificationPods.podNumber,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      scheduledAt: matches.scheduledAt,
      timezone: matches.timezone,
      status: matches.status,
      schedulingStatus: matches.schedulingStatus,
    })
    .from(matches)
    .innerJoin(tournamentPhases, eq(matches.phaseId, tournamentPhases.id))
    .leftJoin(
      qualificationPods,
      eq(matches.qualificationPodId, qualificationPods.id),
    )
    .where(
      and(
        eq(matches.tournamentId, input.tournamentId),
        isNotNull(matches.scheduledAt),
        gte(matches.scheduledAt, now),
        eq(matches.schedulingStatus, "scheduled"),
        ne(matches.status, "cancelled"),
      ),
    )
    .orderBy(asc(matches.scheduledAt))
    .limit(50);

  const match =
    candidates.find(
      (candidate) =>
        candidate.participantAId === input.participantId ||
        candidate.participantBId === input.participantId,
    ) ?? null;

  if (!match) return null;

  const opponentId =
    match.participantAId === input.participantId
      ? match.participantBId
      : match.participantAId;

  const [you] = await db
    .select({
      publicCode: tournamentParticipants.publicCode,
      gamerTag: registrationApplications.gamerTag,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(eq(tournamentParticipants.id, input.participantId))
    .limit(1);

  let opponent: { publicCode: string | null; gamerTag: string } | null = null;
  if (opponentId) {
    const [opp] = await db
      .select({
        publicCode: tournamentParticipants.publicCode,
        gamerTag: registrationApplications.gamerTag,
      })
      .from(tournamentParticipants)
      .innerJoin(
        registrationApplications,
        eq(tournamentParticipants.applicationId, registrationApplications.id),
      )
      .where(eq(tournamentParticipants.id, opponentId))
      .limit(1);
    opponent = opp ?? null;
  }

  const timezone = match.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE;
  const projection: PlayerSafeMatchProjection = {
    matchId: match.matchId,
    phase: match.phaseName,
    podNumber: match.podNumber,
    roundLabel: match.qualificationRound
      ? `${match.qualificationRound}${match.semifinalIndex ? ` ${match.semifinalIndex}` : ""}`
      : match.phaseName,
    yourPublicCode: you?.publicCode ?? null,
    yourGamerTag: you?.gamerTag ?? "",
    opponentPublicCode: opponent?.publicCode ?? null,
    opponentGamerTag: opponent?.gamerTag ?? null,
    scheduledAt: match.scheduledAt,
    scheduledDisplay: formatInTimezone(match.scheduledAt, timezone),
    timezone,
    timezoneLabel: formatTimezoneLabel(timezone),
    matchStatus: match.status,
    schedulingStatus: match.schedulingStatus,
  };

  assertNoSensitivePublicFields({ ...projection });
  return projection;
}
