/**
 * Safe public projections for future competition pages.
 * Never include email, phone, NIN, passport, guardian, admin notes, or audit PII.
 */

export interface PublicTournamentSummary {
  id: string;
  slug: string;
  name: string;
  game: string;
  edition: string;
  format: string | null;
  status: string;
  commencementDate: string | null;
  prizeInfo: string | null;
  targetParticipantCount: number | null;
  qualificationTarget: number | null;
}

export interface PublicPhaseSummary {
  slug: string;
  name: string;
  phaseType: string;
  sequence: number;
  status: string;
  participantLimit: number | null;
  qualificationTarget: number | null;
}

export interface PublicStanding {
  publicCode: string;
  gamerTag: string | null;
  rank: number | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface PublicMatch {
  id: string;
  phaseSlug: string;
  status: string;
  scheduledAt: string | null;
  participantA: { publicCode: string; gamerTag: string | null };
  participantB: { publicCode: string; gamerTag: string | null };
  scoreA: number | null;
  scoreB: number | null;
  winnerPublicCode: string | null;
}

export function toPublicTournamentSummary(row: {
  id: string;
  slug: string;
  name: string;
  game: string;
  edition: string;
  format: string | null;
  status: string;
  commencementDate: string | null;
  prizeInfo: string | null;
  targetParticipantCount: number | null;
  qualificationTarget: number | null;
}): PublicTournamentSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    game: row.game,
    edition: row.edition,
    format: row.format,
    status: row.status,
    commencementDate: row.commencementDate,
    prizeInfo: row.prizeInfo,
    targetParticipantCount: row.targetParticipantCount,
    qualificationTarget: row.qualificationTarget,
  };
}

export interface PublicChampion {
  tournamentName: string;
  tournamentStatus: string;
  championPublicCode: string | null;
  completedAt: string | null;
}

export interface PublicKnockoutRoundSummary {
  roundType: string;
  name: string;
  status: string;
  matchCount: number;
}

export function toPublicChampion(row: {
  tournamentName: string;
  tournamentStatus: string;
  championPublicCode: string | null;
  completedAt: string | null;
}): PublicChampion {
  return {
    tournamentName: row.tournamentName,
    tournamentStatus: row.tournamentStatus,
    championPublicCode: row.championPublicCode,
    completedAt: row.completedAt,
  };
}

export function assertNoSensitivePublicFields(payload: Record<string, unknown>): void {
  const forbidden = [
    "email",
    "phone",
    "nin",
    "passport",
    "identificationNumber",
    "guardian",
    "applicationReference",
    "actorId",
    "recordedBy",
  ];
  for (const key of Object.keys(payload)) {
    if (forbidden.some((item) => key.toLowerCase().includes(item.toLowerCase()))) {
      throw new Error(`Public projection must not include sensitive field: ${key}`);
    }
  }
}
