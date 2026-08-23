import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  qualificationPods,
  tournamentPhaseParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  KG926_QUALIFICATION_POD_COUNT,
  KG926_QUALIFICATION_TARGET,
  parseCompetitionRules,
} from "@/server/tournament/competition/competition-rules";
import {
  advanceAllPodWinnersToTop32,
  advancePodWinnerToTop32,
} from "@/server/tournament/qualification/match-engine";
import {
  getQualificationPhase,
  isQualificationPhaseComplete,
  listQualificationPods,
} from "@/server/tournament/qualification/pod-service";

/**
 * Advances pod winners from qualification → knockout (KIRAKITAH TOP 32).
 * Qualifiers are derived from completed qualification pods — not standings.
 */
export async function advanceQualifiers(input: {
  tournamentId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
  /** Legacy override — explicit ordered participant IDs when admin supplies a finalized list */
  explicitRankingParticipantIds?: string[];
}): Promise<
  | {
      code: "QUALIFICATION_INCOMPLETE";
      message: string;
      completedPods: number;
      requiredPods: number;
    }
  | {
      advanced: number;
      knockoutPhaseId: string;
      alreadyAdvanced: boolean;
      skipped?: number;
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
  const target = rules.qualification.qualificationTarget;

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

  if (!knockoutPhase) {
    throw new CompetitionOperationsError("Knockout phase not found.", "NOT_FOUND", 404);
  }

  const [existingKnockoutCount] = await db
    .select({ value: count() })
    .from(tournamentPhaseParticipants)
    .where(eq(tournamentPhaseParticipants.phaseId, knockoutPhase.id));

  if (Number(existingKnockoutCount?.value ?? 0) >= target) {
    return {
      advanced: Number(existingKnockoutCount?.value ?? 0),
      knockoutPhaseId: knockoutPhase.id,
      alreadyAdvanced: true,
    };
  }

  if (input.explicitRankingParticipantIds?.length) {
    throw new CompetitionOperationsError(
      "Explicit ranking override is not supported for pod-based qualification. Advance pod winners individually or use bulk Top 32 advancement.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const phase = await getQualificationPhase(input.tournamentId);
  const pods = await listQualificationPods(input.tournamentId);

  if (!isQualificationPhaseComplete(pods)) {
    const completedPods = pods.filter(
      (pod) => pod.status === "completed" && pod.qualifierParticipantId != null,
    ).length;
    return {
      code: "QUALIFICATION_INCOMPLETE",
      message: `Qualification requires all ${KG926_QUALIFICATION_POD_COUNT} pods to produce a qualifier before Top 32 advancement.`,
      completedPods,
      requiredPods: KG926_QUALIFICATION_POD_COUNT,
    };
  }

  const completedWithQualifier = await db
    .select({ id: qualificationPods.id })
    .from(qualificationPods)
    .where(
      and(
        eq(qualificationPods.phaseId, phase.id),
        eq(qualificationPods.status, "completed"),
      ),
    );

  if (completedWithQualifier.length < KG926_QUALIFICATION_TARGET) {
    throw new CompetitionOperationsError(
      "Insufficient pod qualifiers for Top 32 advancement.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const result = await advanceAllPodWinnersToTop32({
    tournamentId: input.tournamentId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
  });

  await recordAdminAuditEvent({
    eventType: "QUALIFIER_ADVANCED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      qualificationPhaseId: phase.id,
      knockoutPhaseId: knockoutPhase.id,
      advanced: result.advanced,
      skipped: result.skipped,
      target,
    },
  });

  return {
    advanced: result.advanced,
    knockoutPhaseId: knockoutPhase.id,
    alreadyAdvanced: result.advanced === 0 && result.skipped >= target,
    skipped: result.skipped,
  };
}

/** @deprecated Use advancePodWinnerToTop32 from qualification/match-engine */
export { advancePodWinnerToTop32 };
