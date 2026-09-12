import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matchResults,
  matches,
  participantAccounts,
  qualificationPodMembers,
  qualificationPods,
  registrationApplications,
  tournamentParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import { resolveParticipantTournamentContext } from "@/server/participant/tournament-context";
import {
  classifyFixtureSection,
  computeFixtureOutcome,
  formatFixtureScheduleParts,
  matchStatusLabel,
  sortCompletedFixtures,
  sortUpcomingFixtures,
  type FixtureSection,
} from "@/server/participant/participant-fixture-utils";
import {
  resolveAdminMatchSlot,
  type CompetitorSlotType,
  type DependencyMatchInfo,
  type ParticipantDisplayInfo,
} from "@/server/tournament/competition/admin-match-slot";
import { assertNoSensitivePublicFields } from "@/server/tournament/competition/public-projections";
import {
  formatTimezoneLabel,
  TOURNAMENT_DEFAULT_TIMEZONE,
} from "@/server/tournament/scheduling/timezone";

export type ParticipantFixtureOpponentKind =
  | "participant"
  | "host"
  | "match_winner"
  | "awaiting";

export type ParticipantFixtureView = {
  matchId: string;
  matchShortId: string;
  tournamentId: string;
  tournamentName: string;
  phase: string;
  roundLabel: string;
  podNumber: number | null;
  yourGamerTag: string;
  yourUsername: string | null;
  yourPublicCode: string | null;
  yourVerified: boolean;
  opponentLabel: string;
  opponentGamerTag: string | null;
  opponentUsername: string | null;
  opponentPublicCode: string | null;
  opponentVerified: boolean;
  opponentKind: ParticipantFixtureOpponentKind;
  scheduledAt: string | null;
  scheduledDateDisplay: string;
  scheduledTimeDisplay: string;
  schedulePendingLabel: string | null;
  timezone: string;
  timezoneLabel: string;
  matchStatus: string;
  matchStatusLabel: string;
  schedulingStatus: string;
  section: FixtureSection;
  yourScore: number | null;
  opponentScore: number | null;
  outcomeLabel: string | null;
  resultLabel: string;
  completedAt: string | null;
};

export type ParticipantFixturesPayload = {
  upcoming: ParticipantFixtureView[];
  completed: ParticipantFixtureView[];
};

async function loadParticipantIdsForAccount(accountId: string) {
  const db = getDb();
  const rows = await db
    .select({
      participantId: tournamentParticipants.id,
      tournamentId: tournamentParticipants.tournamentId,
      status: tournamentParticipants.status,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(
      and(
        eq(registrationApplications.participantAccountId, accountId),
        eq(tournamentParticipants.status, "selected"),
      ),
    );

  return rows;
}

export async function listParticipantFixtures(
  accountId: string,
  tournamentId?: string,
): Promise<ParticipantFixturesPayload> {
  const memberships = await loadParticipantIdsForAccount(accountId);
  const scoped = tournamentId
    ? memberships.filter((row) => row.tournamentId === tournamentId)
    : memberships;

  const participantIds = scoped.map((row) => row.participantId);
  if (participantIds.length === 0) {
    return { upcoming: [], completed: [] };
  }

  const db = getDb();
  const rows = await db
    .select({
      matchId: matches.id,
      tournamentId: matches.tournamentId,
      tournamentName: tournaments.name,
      phaseName: tournamentPhases.name,
      podNumber: qualificationPods.podNumber,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      slotAType: matches.slotAType,
      slotBType: matches.slotBType,
      dependsOnMatchAId: matches.dependsOnMatchAId,
      dependsOnMatchBId: matches.dependsOnMatchBId,
      scheduledAt: matches.scheduledAt,
      timezone: matches.timezone,
      status: matches.status,
      schedulingStatus: matches.schedulingStatus,
      authoritativeResultId: matches.authoritativeResultId,
      updatedAt: matches.updatedAt,
    })
    .from(matches)
    .innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
    .innerJoin(tournamentPhases, eq(matches.phaseId, tournamentPhases.id))
    .leftJoin(qualificationPods, eq(matches.qualificationPodId, qualificationPods.id))
    .where(
      or(
        inArray(matches.participantAId, participantIds),
        inArray(matches.participantBId, participantIds),
      )!,
    )
    .orderBy(desc(matches.updatedAt));

  const youIds = new Set(participantIds);
  const allParticipantIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.participantAId, row.participantBId])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const dependencyIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.dependsOnMatchAId, row.dependsOnMatchBId])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const participantMap = await loadParticipantDisplayMap(allParticipantIds);
  const dependencyMap = await loadDependencyMatchMap(dependencyIds);

  const resultIds = rows
    .map((row) => row.authoritativeResultId)
    .filter((id): id is string => Boolean(id));

  const resultMap = new Map<
    string,
    {
      participantAScore: number;
      participantBScore: number;
      winnerParticipantId: string | null;
      isDraw: boolean;
      recordedAt: string;
    }
  >();

  if (resultIds.length > 0) {
    const results = await db
      .select({
        id: matchResults.id,
        participantAScore: matchResults.participantAScore,
        participantBScore: matchResults.participantBScore,
        winnerParticipantId: matchResults.winnerParticipantId,
        isDraw: matchResults.isDraw,
        recordedAt: matchResults.recordedAt,
      })
      .from(matchResults)
      .where(inArray(matchResults.id, resultIds));

    for (const result of results) {
      resultMap.set(result.id, result);
    }
  }

  const fixtures: ParticipantFixtureView[] = [];

  for (const row of rows) {
    const youAreA = row.participantAId ? youIds.has(row.participantAId) : false;
    const youAreB = row.participantBId ? youIds.has(row.participantBId) : false;
    if (!youAreA && !youAreB) continue;

    const yourParticipantId = youAreA ? row.participantAId! : row.participantBId!;
    const you = participantMap.get(yourParticipantId);

    const opponentSlot = resolveAdminMatchSlot({
      slotType: (youAreA ? row.slotBType : row.slotAType) as CompetitorSlotType | null,
      participantId: youAreA ? row.participantBId : row.participantAId,
      dependsOnMatchId: youAreA ? row.dependsOnMatchBId : row.dependsOnMatchAId,
      participant:
        (youAreA ? row.participantBId : row.participantAId)
          ? participantMap.get(youAreA ? row.participantBId! : row.participantAId!)
          : null,
      dependencyMatch:
        (youAreA ? row.dependsOnMatchBId : row.dependsOnMatchAId)
          ? dependencyMap.get(youAreA ? row.dependsOnMatchBId! : row.dependsOnMatchAId!)
          : null,
    });

    const timezone = row.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE;
    const schedule = formatFixtureScheduleParts(row.scheduledAt, timezone);
    const result = row.authoritativeResultId
      ? resultMap.get(row.authoritativeResultId)
      : null;

    const youAreParticipantA = youAreA;
    let yourScore: number | null = null;
    let opponentScore: number | null = null;

    if (result) {
      yourScore = youAreParticipantA
        ? result.participantAScore
        : result.participantBScore;
      opponentScore = youAreParticipantA
        ? result.participantBScore
        : result.participantAScore;
    }

    const { outcomeLabel, resultLabel } = computeFixtureOutcome({
      participantId: yourParticipantId,
      matchStatus: row.status,
      youAreParticipantA,
      winnerParticipantId: result?.winnerParticipantId ?? null,
      isDraw: result?.isDraw ?? false,
      yourScore,
      opponentScore,
    });

    const roundLabel = row.qualificationRound
      ? `${row.qualificationRound}${row.semifinalIndex ? ` ${row.semifinalIndex}` : ""}`
      : row.phaseName;

    const fixture: ParticipantFixtureView = {
      matchId: row.matchId,
      matchShortId: row.matchId.slice(0, 8),
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
      phase: row.phaseName,
      roundLabel,
      podNumber: row.podNumber,
      yourGamerTag: you?.gamerTag ?? "You",
      yourUsername: you?.username ?? null,
      yourPublicCode: you?.publicCode ?? null,
      yourVerified: you?.verified ?? false,
      opponentLabel: opponentSlot.label,
      opponentGamerTag: opponentSlot.gamerTag,
      opponentUsername: opponentSlot.username,
      opponentPublicCode: opponentSlot.publicCode,
      opponentVerified: opponentSlot.verified,
      opponentKind: opponentSlot.kind,
      scheduledAt: row.scheduledAt,
      scheduledDateDisplay: schedule.date,
      scheduledTimeDisplay: schedule.time,
      schedulePendingLabel: schedule.pendingLabel,
      timezone,
      timezoneLabel: formatTimezoneLabel(timezone),
      matchStatus: row.status,
      matchStatusLabel: matchStatusLabel(row.status),
      schedulingStatus: row.schedulingStatus,
      section: classifyFixtureSection(row.status),
      yourScore,
      opponentScore,
      outcomeLabel,
      resultLabel,
      completedAt: result?.recordedAt ?? (classifyFixtureSection(row.status) === "completed" ? row.updatedAt : null),
    };

    assertNoSensitivePublicFields({ ...fixture });
    fixtures.push(fixture);
  }

  return {
    upcoming: sortUpcomingFixtures(fixtures.filter((f) => f.section === "upcoming")),
    completed: sortCompletedFixtures(fixtures.filter((f) => f.section === "completed")),
  };
}

export async function getParticipantFixtureByMatchId(
  accountId: string,
  matchId: string,
): Promise<ParticipantFixtureView | null> {
  const db = getDb();
  const [row] = await db
    .select({ tournamentId: matches.tournamentId })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!row) return null;

  const ctx = await resolveParticipantTournamentContext(accountId, row.tournamentId);
  if (!ctx.participantId) return null;

  const payload = await listParticipantFixtures(accountId, row.tournamentId);
  return (
    [...payload.upcoming, ...payload.completed].find((f) => f.matchId === matchId) ??
    null
  );
}

async function loadParticipantDisplayMap(participantIds: string[]) {
  const map = new Map<string, ParticipantDisplayInfo>();
  if (participantIds.length === 0) return map;

  const db = getDb();
  const rows = await db
    .select({
      participantId: tournamentParticipants.id,
      publicCode: tournamentParticipants.publicCode,
      gamerTag: registrationApplications.gamerTag,
      username: participantAccounts.username,
      identityVerificationStatus: registrationApplications.identityVerificationStatus,
      podNumber: qualificationPods.podNumber,
      positionNumber: qualificationPodMembers.positionNumber,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .leftJoin(
      participantAccounts,
      eq(registrationApplications.participantAccountId, participantAccounts.id),
    )
    .leftJoin(
      qualificationPodMembers,
      eq(qualificationPodMembers.participantId, tournamentParticipants.id),
    )
    .leftJoin(
      qualificationPods,
      eq(qualificationPodMembers.podId, qualificationPods.id),
    )
    .where(inArray(tournamentParticipants.id, participantIds));

  for (const row of rows) {
    map.set(row.participantId, {
      participantId: row.participantId,
      publicCode: row.publicCode,
      gamerTag: row.gamerTag,
      username: row.username,
      verified: row.identityVerificationStatus === "verified",
      podNumber: row.podNumber,
      positionNumber: row.positionNumber,
    });
  }

  return map;
}

async function loadDependencyMatchMap(matchIds: string[]) {
  const map = new Map<string, DependencyMatchInfo>();
  if (matchIds.length === 0) return map;

  const db = getDb();
  const rows = await db
    .select({
      id: matches.id,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      bracketSlotIndex: matches.bracketSlotIndex,
    })
    .from(matches)
    .where(inArray(matches.id, matchIds));

  for (const row of rows) {
    map.set(row.id, row);
  }

  return map;
}
