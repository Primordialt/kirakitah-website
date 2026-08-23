import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  knockoutPairingSets,
  knockoutRounds,
  tournamentParticipants,
  tournamentPhaseParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import {
  KG926_COMPETITION_RULES_VERSION,
  KG926_KNOCKOUT_ENTRANTS,
  parseCompetitionRules,
} from "@/server/tournament/competition/competition-rules";
import {
  isQualificationPhaseComplete,
  listQualificationPods,
} from "@/server/tournament/qualification/pod-service";

export interface KnockoutReadinessResult {
  ready: boolean;
  reasons: string[];
  code: "READY" | "KNOCKOUT_NOT_READY";
  qualifierCount: number;
  validQualifierCount: number;
  rulesVersion: string;
  knockoutPhaseId: string | null;
  confirmedPairings: boolean;
  bracketStatus: string | null;
}

export async function getKnockoutPhase(tournamentId: string) {
  const db = getDb();
  const [phase] = await db
    .select()
    .from(tournamentPhases)
    .where(
      and(
        eq(tournamentPhases.tournamentId, tournamentId),
        eq(tournamentPhases.slug, "knockout"),
      ),
    )
    .limit(1);
  return phase ?? null;
}

export async function listTop32KnockoutMembers(tournamentId: string) {
  const phase = await getKnockoutPhase(tournamentId);
  if (!phase) return [];

  const db = getDb();
  return db
    .select({
      participantId: tournamentPhaseParticipants.participantId,
      publicCode: tournamentParticipants.publicCode,
      status: tournamentParticipants.status,
      phaseStatus: tournamentPhaseParticipants.status,
      seed: tournamentPhaseParticipants.seed,
      qualificationPosition: tournamentPhaseParticipants.qualificationPosition,
    })
    .from(tournamentPhaseParticipants)
    .innerJoin(
      tournamentParticipants,
      eq(tournamentPhaseParticipants.participantId, tournamentParticipants.id),
    )
    .where(eq(tournamentPhaseParticipants.phaseId, phase.id));
}

/**
 * Evaluates whether knockout bracket generation may proceed.
 * Does not modify the database.
 */
export async function validateKnockoutReadiness(
  tournamentId: string,
): Promise<KnockoutReadinessResult> {
  const reasons: string[] = [];
  const db = getDb();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    return {
      ready: false,
      reasons: ["Tournament not found."],
      code: "KNOCKOUT_NOT_READY",
      qualifierCount: 0,
      validQualifierCount: 0,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
      knockoutPhaseId: null,
      confirmedPairings: false,
      bracketStatus: null,
    };
  }

  const rules = parseCompetitionRules(tournament.competitionRules);
  const phase = await getKnockoutPhase(tournamentId);

  if (!phase) {
    reasons.push("Knockout phase not found.");
  }

  const pods = await listQualificationPods(tournamentId).catch(() => []);
  if (!isQualificationPhaseComplete(pods)) {
    reasons.push("Qualification phase is incomplete — all 32 pods must produce a qualifier.");
  }

  const members = phase ? await listTop32KnockoutMembers(tournamentId) : [];
  const qualifierCount = members.length;

  const validMembers = members.filter(
    (m) =>
      m.status === "selected" &&
      m.phaseStatus !== "withdrawn" &&
      m.phaseStatus !== "disqualified",
  );
  const validQualifierCount = validMembers.length;

  if (qualifierCount !== KG926_KNOCKOUT_ENTRANTS) {
    reasons.push(
      `Expected exactly ${KG926_KNOCKOUT_ENTRANTS} knockout phase members, found ${qualifierCount}.`,
    );
  }

  if (validQualifierCount !== KG926_KNOCKOUT_ENTRANTS) {
    reasons.push(
      `Expected ${KG926_KNOCKOUT_ENTRANTS} valid selected qualifiers, found ${validQualifierCount}.`,
    );
  }

  const uniqueIds = new Set(members.map((m) => m.participantId));
  if (uniqueIds.size !== members.length) {
    reasons.push("Duplicate participants detected in knockout phase.");
  }

  if (phase) {
    const rounds = await db
      .select({ id: knockoutRounds.id })
      .from(knockoutRounds)
      .where(eq(knockoutRounds.phaseId, phase.id));
    if (rounds.length < 5) {
      reasons.push("Knockout rounds are missing (expected R32, R16, QF, SF, Grand Final).");
    }
  }

  const [confirmedSet] = phase
    ? await db
        .select({ id: knockoutPairingSets.id })
        .from(knockoutPairingSets)
        .where(
          and(
            eq(knockoutPairingSets.tournamentId, tournamentId),
            eq(knockoutPairingSets.status, "confirmed"),
          ),
        )
        .limit(1)
    : [null];

  return {
    ready: reasons.length === 0,
    reasons,
    code: reasons.length === 0 ? "READY" : "KNOCKOUT_NOT_READY",
    qualifierCount,
    validQualifierCount,
    rulesVersion: rules.rulesVersion,
    knockoutPhaseId: phase?.id ?? null,
    confirmedPairings: Boolean(confirmedSet),
    bracketStatus: tournament.knockoutBracketStatus,
  };
}

export async function getKnockoutDashboard(tournamentId: string) {
  const readiness = await validateKnockoutReadiness(tournamentId);
  const phase = await getKnockoutPhase(tournamentId);
  const db = getDb();

  const [tournament] = await db
    .select({
      status: tournaments.status,
      championParticipantId: tournaments.championParticipantId,
      knockoutBracketStatus: tournaments.knockoutBracketStatus,
      completedAt: tournaments.completedAt,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  const roundCounts: Record<string, number> = {
    round_of_32: 0,
    round_of_16: 0,
    quarterfinal: 0,
    semifinal: 0,
    grand_final: 0,
  };

  if (phase) {
    const { matches } = await import("@/server/db/schema");
    const rounds = await db
      .select()
      .from(knockoutRounds)
      .where(eq(knockoutRounds.phaseId, phase.id));

    for (const round of rounds) {
      const [row] = await db
        .select({ value: count() })
        .from(matches)
        .where(eq(matches.knockoutRoundId, round.id));
      roundCounts[round.roundType] = Number(row?.value ?? 0);
    }
  }

  return {
    readiness,
    tournamentStatus: tournament?.status ?? null,
    bracketStatus: tournament?.knockoutBracketStatus ?? "not_generated",
    championParticipantId: tournament?.championParticipantId ?? null,
    completedAt: tournament?.completedAt ?? null,
    expected: {
      participants: 32,
      r32: 16,
      r16: 8,
      qf: 4,
      sf: 2,
      final: 1,
    },
    actual: {
      participants: readiness.qualifierCount,
      r32: roundCounts.round_of_32,
      r16: roundCounts.round_of_16,
      qf: roundCounts.quarterfinal,
      sf: roundCounts.semifinal,
      final: roundCounts.grand_final,
    },
  };
}

export async function assertParticipantsAreTop32(
  tournamentId: string,
  participantIds: string[],
) {
  const members = await listTop32KnockoutMembers(tournamentId);
  const valid = new Map(
    members
      .filter((m) => m.status === "selected")
      .map((m) => [m.participantId, m]),
  );

  for (const id of participantIds) {
    if (!valid.has(id)) {
      return {
        ok: false as const,
        message: "Participant is not a valid Top 32 knockout member.",
      };
    }
  }
  return { ok: true as const, members: valid };
}

/** Count helper used by pairing validation */
export async function countKnockoutMembersByIds(
  phaseId: string,
  participantIds: string[],
) {
  if (participantIds.length === 0) return 0;
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(tournamentPhaseParticipants)
    .where(
      and(
        eq(tournamentPhaseParticipants.phaseId, phaseId),
        inArray(tournamentPhaseParticipants.participantId, participantIds),
      ),
    );
  return Number(row?.value ?? 0);
}
