import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { competitionPolicyHistory, tournaments } from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  buildCompetitionPolicy,
  listFinalizedPolicyItems,
  listPendingPolicyItems,
  toPolicySnapshot,
  type Kg926CompetitionPolicy,
} from "@/server/tournament/rules/competition-policy";
import { KG926_COMPETITION_RULES_VERSION } from "@/server/tournament/competition/competition-rules";

export async function getCompetitionPolicyView(
  tournamentId: string,
  options?: {
    actorId?: string;
    actorRole?: AdminRole;
    requestId?: string;
    recordViewAudit?: boolean;
  },
) {
  const db = getDb();
  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      competitionRules: tournaments.competitionRules,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    throw new CompetitionOperationsError("Tournament not found.", "NOT_FOUND", 404);
  }

  const policy = buildCompetitionPolicy(tournament.competitionRules);

  if (options?.recordViewAudit && options.actorId && options.actorRole) {
    await recordAdminAuditEvent({
      eventType: "COMPETITION_POLICY_VIEWED",
      actorId: options.actorId,
      actorRole: options.actorRole,
      requestId: options.requestId,
      metadata: {
        tournamentId,
        rulesVersion: policy.rulesVersion,
      },
    });
  }

  return {
    tournamentId,
    tournamentName: tournament.name,
    policy,
    finalized: listFinalizedPolicyItems(policy),
    pending: listPendingPolicyItems(policy),
  };
}

export async function listCompetitionPolicyHistory(tournamentId: string) {
  const db = getDb();
  return db
    .select({
      id: competitionPolicyHistory.id,
      rulesVersion: competitionPolicyHistory.rulesVersion,
      changeReason: competitionPolicyHistory.changeReason,
      changedBy: competitionPolicyHistory.changedBy,
      effectiveAt: competitionPolicyHistory.effectiveAt,
    })
    .from(competitionPolicyHistory)
    .where(eq(competitionPolicyHistory.tournamentId, tournamentId))
    .orderBy(desc(competitionPolicyHistory.effectiveAt));
}

/**
 * SUPER_ADMIN only. Does not invent new rules versions.
 * Only allows storing an explicit policy snapshot with reason (history append).
 * Structural FINALIZED rules remain enforced by parseCompetitionRules.
 */
export async function recordCompetitionPolicyChange(input: {
  tournamentId: string;
  reason: string;
  /** Optional operational notes stored in snapshot metadata — no invented gameplay values */
  notes?: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  if (input.actorRole !== "SUPER_ADMIN") {
    throw new CompetitionOperationsError(
      "Only SUPER_ADMIN may change competition policy records.",
      "FORBIDDEN",
      403,
    );
  }

  const reason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (reason.length < 8) {
    throw new CompetitionOperationsError(
      "Policy change reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const view = await getCompetitionPolicyView(input.tournamentId);
  const policy: Kg926CompetitionPolicy = view.policy;
  const snapshot = toPolicySnapshot(policy);
  if (input.notes) {
    snapshot.adminNotes = input.notes.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  }

  const db = getDb();
  const [row] = await db
    .insert(competitionPolicyHistory)
    .values({
      tournamentId: input.tournamentId,
      rulesVersion: policy.rulesVersion || KG926_COMPETITION_RULES_VERSION,
      configuration: snapshot,
      changeReason: reason,
      changedBy: input.actorId,
    })
    .returning({ id: competitionPolicyHistory.id });

  await recordAdminAuditEvent({
    eventType: "COMPETITION_POLICY_CHANGED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      historyId: row.id,
      rulesVersion: policy.rulesVersion,
      reasonLength: reason.length,
    },
  });

  return { historyId: row.id, rulesVersion: policy.rulesVersion };
}
