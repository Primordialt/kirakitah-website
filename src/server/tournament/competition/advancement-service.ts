import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  tournamentPhaseParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  isQualificationAdvancementConfigured,
  parseCompetitionRules,
} from "@/server/tournament/competition/competition-rules";
import { listQualificationStandings } from "@/server/tournament/competition/standings-service";
import { addParticipantToPhase } from "@/server/tournament/competition/phase-service";

/**
 * Advances qualifiers from qualification → knockout.
 * Ranking/tie-break/advancement mechanics are PENDING PRODUCT DECISION.
 */
export async function advanceQualifiers(input: {
  tournamentId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
  /**
   * Explicit ordered participant IDs when Product Owner provides a finalized ranking.
   * Without configured advancement rules AND without explicit ranking, returns not-configured.
   */
  explicitRankingParticipantIds?: string[];
}): Promise<
  | {
      code: "QUALIFICATION_RULES_NOT_CONFIGURED";
      message: string;
    }
  | {
      advanced: number;
      knockoutPhaseId: string;
      alreadyAdvanced: boolean;
    }
> {
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

  const [qualificationPhase] = await db
    .select()
    .from(tournamentPhases)
    .where(
      and(
        eq(tournamentPhases.tournamentId, input.tournamentId),
        eq(tournamentPhases.slug, "qualification"),
      ),
    )
    .limit(1);

  const [knockoutPhase] = await db
    .select()
    .from(tournamentPhases)
    .where(
      and(
        eq(tournamentPhases.tournamentId, input.tournamentId),
        eq(tournamentPhases.slug, "knockout"),
      ),
    )
    .limit(1);

  if (!qualificationPhase || !knockoutPhase) {
    throw new CompetitionOperationsError(
      "Qualification or knockout phase not found.",
      "NOT_FOUND",
      404,
    );
  }

  const existingKnockoutMembers = await db
    .select({ id: tournamentPhaseParticipants.id })
    .from(tournamentPhaseParticipants)
    .where(eq(tournamentPhaseParticipants.phaseId, knockoutPhase.id))
    .limit(1);

  if (existingKnockoutMembers.length > 0) {
    return {
      advanced: existingKnockoutMembers.length,
      knockoutPhaseId: knockoutPhase.id,
      alreadyAdvanced: true,
    };
  }

  const target = rules.qualification.qualificationTarget;

  if (
    !isQualificationAdvancementConfigured(rules) &&
    !input.explicitRankingParticipantIds
  ) {
    return {
      code: "QUALIFICATION_RULES_NOT_CONFIGURED",
      message:
        "Qualification advancement is PENDING PRODUCT DECISION. Provide an explicit finalized ranking or configure advancement rules.",
    };
  }

  let orderedIds = input.explicitRankingParticipantIds;

  if (!orderedIds) {
    const standings = await listQualificationStandings(qualificationPhase.id);
    if (standings.length < target) {
      throw new CompetitionOperationsError(
        "Insufficient standings to advance qualifiers.",
        "VALIDATION_ERROR",
        400,
      );
    }
    orderedIds = standings.slice(0, target).map((row) => row.participantId);
  }

  if (orderedIds.length < target) {
    throw new CompetitionOperationsError(
      `Advancement requires ${target} participants.`,
      "VALIDATION_ERROR",
      400,
    );
  }

  const toAdvance = orderedIds.slice(0, target);
  let advanced = 0;

  for (let index = 0; index < toAdvance.length; index += 1) {
    const participantId = toAdvance[index];
    const result = await addParticipantToPhase({
      phaseId: knockoutPhase.id,
      participantId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      seed: index + 1,
    });

    await db
      .update(tournamentPhaseParticipants)
      .set({
        status: "qualified",
        qualificationPosition: index + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(tournamentPhaseParticipants.phaseId, qualificationPhase.id),
          eq(tournamentPhaseParticipants.participantId, participantId),
        ),
      );

    if (!result.alreadyMember) {
      advanced += 1;
    }
  }

  await recordAdminAuditEvent({
    eventType: "QUALIFIER_ADVANCED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      qualificationPhaseId: qualificationPhase.id,
      knockoutPhaseId: knockoutPhase.id,
      advanced,
      target,
    },
  });

  return {
    advanced,
    knockoutPhaseId: knockoutPhase.id,
    alreadyAdvanced: false,
  };
}
