import { and, desc, eq, inArray } from "drizzle-orm";

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

  computeTournamentFixtureResult,

  formatFixtureScheduleParts,

  matchStatusLabel,

  sortCompletedFixtures,

  sortUpcomingFixtures,

  type FixtureSection,

} from "@/server/participant/participant-fixture-utils";

import {

  resolveAdminMatchSlot,

  type AdminMatchSlotProjection,

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



export type FixtureCompetitorView = {

  label: string;

  gamerTag: string | null;

  username: string | null;

  publicCode: string | null;

  verified: boolean;

  kind: ParticipantFixtureOpponentKind;

};



export type TournamentFixtureView = {

  matchId: string;

  matchShortId: string;

  tournamentId: string;

  tournamentName: string;

  phase: string;

  roundLabel: string;

  podNumber: number | null;

  competitorA: FixtureCompetitorView;

  competitorB: FixtureCompetitorView;

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

  scoreA: number | null;

  scoreB: number | null;

  resultLabel: string;

  completedAt: string | null;

  isYourMatch: boolean;

};



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



export type TournamentFixturesPayload = {

  upcoming: TournamentFixtureView[];

  completed: TournamentFixtureView[];

};



export type ParticipantFixturesPayload = {

  upcoming: ParticipantFixtureView[];

  completed: ParticipantFixtureView[];

};



export type ParticipantFixtureBundle = {

  all: TournamentFixturesPayload;

  mine: ParticipantFixturesPayload;

};



export type FixtureScope = "all" | "mine";



export type ListParticipantFixturesInput = {

  accountId: string;

  scope?: FixtureScope;

  tournamentId?: string;

};



export type ParticipantFixtureDetail = {

  tournament: TournamentFixtureView;

  personal: ParticipantFixtureView | null;

};



type MatchRow = {

  matchId: string;

  tournamentId: string;

  tournamentName: string;

  phaseName: string;

  podNumber: number | null;

  qualificationRound: string | null;

  semifinalIndex: number | null;

  participantAId: string | null;

  participantBId: string | null;

  slotAType: string | null;

  slotBType: string | null;

  dependsOnMatchAId: string | null;

  dependsOnMatchBId: string | null;

  scheduledAt: string | null;

  timezone: string | null;

  status: string;

  schedulingStatus: string;

  authoritativeResultId: string | null;

  updatedAt: string;

};



type ResultRow = {

  participantAScore: number;

  participantBScore: number;

  winnerParticipantId: string | null;

  isDraw: boolean;

  recordedAt: string;

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



async function loadMatchRows(tournamentIds: string[]): Promise<MatchRow[]> {

  if (tournamentIds.length === 0) return [];



  const db = getDb();

  return db

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

    .where(inArray(matches.tournamentId, tournamentIds))

    .orderBy(desc(matches.updatedAt));

}



async function loadResultMap(resultIds: string[]) {

  const map = new Map<string, ResultRow>();

  if (resultIds.length === 0) return map;



  const db = getDb();

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

    map.set(result.id, result);

  }



  return map;

}



function competitorFromSlot(slot: AdminMatchSlotProjection): FixtureCompetitorView {

  return {

    label: slot.label,

    gamerTag: slot.gamerTag,

    username: slot.username,

    publicCode: slot.publicCode,

    verified: slot.verified,

    kind: slot.kind,

  };

}



function roundLabelForRow(row: MatchRow): string {

  return row.qualificationRound

    ? `${row.qualificationRound}${row.semifinalIndex ? ` ${row.semifinalIndex}` : ""}`

    : row.phaseName;

}



function resolveSlotForRow(

  row: MatchRow,

  side: "A" | "B",

  participantMap: Map<string, ParticipantDisplayInfo>,

  dependencyMap: Map<string, DependencyMatchInfo>,

): FixtureCompetitorView {

  const slot = resolveAdminMatchSlot({

    slotType: (side === "A" ? row.slotAType : row.slotBType) as CompetitorSlotType | null,

    participantId: side === "A" ? row.participantAId : row.participantBId,

    dependsOnMatchId: side === "A" ? row.dependsOnMatchAId : row.dependsOnMatchBId,

    participant:

      (side === "A" ? row.participantAId : row.participantBId)

        ? participantMap.get(side === "A" ? row.participantAId! : row.participantBId!)

        : null,

    dependencyMatch:

      (side === "A" ? row.dependsOnMatchAId : row.dependsOnMatchBId)

        ? dependencyMap.get(

            side === "A" ? row.dependsOnMatchAId! : row.dependsOnMatchBId!,

          )

        : null,

  });



  return competitorFromSlot(slot);

}



function buildTournamentFixture(

  row: MatchRow,

  participantMap: Map<string, ParticipantDisplayInfo>,

  dependencyMap: Map<string, DependencyMatchInfo>,

  resultMap: Map<string, ResultRow>,

  youIds: Set<string>,

): TournamentFixtureView {

  const timezone = row.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE;

  const schedule = formatFixtureScheduleParts(row.scheduledAt, timezone);

  const result = row.authoritativeResultId

    ? resultMap.get(row.authoritativeResultId)

    : null;



  const scoreA = result?.participantAScore ?? null;

  const scoreB = result?.participantBScore ?? null;

  const section = classifyFixtureSection(row.status);

  const isYourMatch =

    (row.participantAId ? youIds.has(row.participantAId) : false) ||

    (row.participantBId ? youIds.has(row.participantBId) : false);



  const fixture: TournamentFixtureView = {

    matchId: row.matchId,

    matchShortId: row.matchId.slice(0, 8),

    tournamentId: row.tournamentId,

    tournamentName: row.tournamentName,

    phase: row.phaseName,

    roundLabel: roundLabelForRow(row),

    podNumber: row.podNumber,

    competitorA: resolveSlotForRow(row, "A", participantMap, dependencyMap),

    competitorB: resolveSlotForRow(row, "B", participantMap, dependencyMap),

    scheduledAt: row.scheduledAt,

    scheduledDateDisplay: schedule.date,

    scheduledTimeDisplay: schedule.time,

    schedulePendingLabel: schedule.pendingLabel,

    timezone,

    timezoneLabel: formatTimezoneLabel(timezone),

    matchStatus: row.status,

    matchStatusLabel: matchStatusLabel(row.status),

    schedulingStatus: row.schedulingStatus,

    section,

    scoreA,

    scoreB,

    resultLabel: computeTournamentFixtureResult({

      matchStatus: row.status,

      scoreA,

      scoreB,

      isDraw: result?.isDraw ?? false,

      winnerParticipantId: result?.winnerParticipantId ?? null,

    }),

    completedAt:

      result?.recordedAt ??

      (section === "completed" ? row.updatedAt : null),

    isYourMatch,

  };



  assertNoSensitivePublicFields({ ...fixture });

  return fixture;

}



function buildPersonalFixture(

  row: MatchRow,

  participantMap: Map<string, ParticipantDisplayInfo>,

  dependencyMap: Map<string, DependencyMatchInfo>,

  resultMap: Map<string, ResultRow>,

  youIds: Set<string>,

): ParticipantFixtureView | null {

  const youAreA = row.participantAId ? youIds.has(row.participantAId) : false;

  const youAreB = row.participantBId ? youIds.has(row.participantBId) : false;

  if (!youAreA && !youAreB) return null;



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



  const section = classifyFixtureSection(row.status);



  const fixture: ParticipantFixtureView = {

    matchId: row.matchId,

    matchShortId: row.matchId.slice(0, 8),

    tournamentId: row.tournamentId,

    tournamentName: row.tournamentName,

    phase: row.phaseName,

    roundLabel: roundLabelForRow(row),

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

    section,

    yourScore,

    opponentScore,

    outcomeLabel,

    resultLabel,

    completedAt:

      result?.recordedAt ?? (section === "completed" ? row.updatedAt : null),

  };



  assertNoSensitivePublicFields({ ...fixture });

  return fixture;

}



async function buildParticipantFixtureBundle(

  accountId: string,

  tournamentId?: string,

): Promise<ParticipantFixtureBundle> {

  const memberships = await loadParticipantIdsForAccount(accountId);

  const scoped = tournamentId

    ? memberships.filter((row) => row.tournamentId === tournamentId)

    : memberships;



  const participantIds = scoped.map((row) => row.participantId);

  const tournamentIds = [...new Set(scoped.map((row) => row.tournamentId))];



  if (tournamentIds.length === 0) {

    return {

      all: { upcoming: [], completed: [] },

      mine: { upcoming: [], completed: [] },

    };

  }



  const rows = await loadMatchRows(tournamentIds);

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



  const resultMap = await loadResultMap(resultIds);



  const allFixtures: TournamentFixtureView[] = [];

  const mineFixtures: ParticipantFixtureView[] = [];



  for (const row of rows) {

    allFixtures.push(

      buildTournamentFixture(row, participantMap, dependencyMap, resultMap, youIds),

    );



    const personal = buildPersonalFixture(

      row,

      participantMap,

      dependencyMap,

      resultMap,

      youIds,

    );

    if (personal) {

      mineFixtures.push(personal);

    }

  }



  return {

    all: {

      upcoming: sortUpcomingFixtures(

        allFixtures.filter((fixture) => fixture.section === "upcoming"),

      ),

      completed: sortCompletedFixtures(

        allFixtures.filter((fixture) => fixture.section === "completed"),

      ),

    },

    mine: {

      upcoming: sortUpcomingFixtures(

        mineFixtures.filter((fixture) => fixture.section === "upcoming"),

      ),

      completed: sortCompletedFixtures(

        mineFixtures.filter((fixture) => fixture.section === "completed"),

      ),

    },

  };

}



export async function listParticipantFixtureBundle(input: {

  accountId: string;

  tournamentId?: string;

}): Promise<ParticipantFixtureBundle> {

  return buildParticipantFixtureBundle(input.accountId, input.tournamentId);

}



export async function listParticipantFixtures(

  input: ListParticipantFixturesInput | string,

  legacyTournamentId?: string,

): Promise<TournamentFixturesPayload | ParticipantFixturesPayload> {

  const normalized: ListParticipantFixturesInput =

    typeof input === "string"

      ? { accountId: input, tournamentId: legacyTournamentId, scope: "mine" }

      : input;



  const bundle = await buildParticipantFixtureBundle(

    normalized.accountId,

    normalized.tournamentId,

  );



  return normalized.scope === "all" ? bundle.all : bundle.mine;

}



export async function getParticipantFixtureByMatchId(

  accountId: string,

  matchId: string,

): Promise<ParticipantFixtureDetail | null> {

  const db = getDb();

  const [row] = await db

    .select({ tournamentId: matches.tournamentId })

    .from(matches)

    .where(eq(matches.id, matchId))

    .limit(1);



  if (!row) return null;



  const ctx = await resolveParticipantTournamentContext(accountId, row.tournamentId);

  if (!ctx.participantId) return null;



  const bundle = await buildParticipantFixtureBundle(accountId, row.tournamentId);

  const tournament =

    [...bundle.all.upcoming, ...bundle.all.completed].find(

      (fixture) => fixture.matchId === matchId,

    ) ?? null;



  if (!tournament) return null;



  const personal =

    [...bundle.mine.upcoming, ...bundle.mine.completed].find(

      (fixture) => fixture.matchId === matchId,

    ) ?? null;



  return { tournament, personal };

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


