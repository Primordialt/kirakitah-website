import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  eligibilityEvaluations,
  registrationApplications,
  tournamentParticipants,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import {
  evaluateRegistrationEligibilityByReference,
  loadApplicationForEligibility,
} from "@/server/tournament/eligibility/eligibility-service";
import type { EligibilityEvaluationResult } from "@/server/tournament/eligibility/eligibility-types";
import { ELIGIBILITY_REASON_LABELS } from "@/server/tournament/eligibility/eligibility-reasons";

export class ParticipantSelectionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "ParticipantSelectionError";
    this.code = code;
    this.status = status;
  }
}

export interface ParticipantListItem {
  participantId: string;
  applicationReference: string;
  applicantName: string;
  status: string;
  selectedAt: string;
  eligibilityState: "ELIGIBLE" | "NOT_ELIGIBLE" | "SELECTED";
}

const ALLOWED_PAGE_SIZES = new Set([10, 25, 50]);

export async function getTournamentById(tournamentId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  return row ?? null;
}

export async function listTournamentParticipants(options: {
  tournamentId: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: ParticipantListItem[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = ALLOWED_PAGE_SIZES.has(options.pageSize ?? 25)
    ? (options.pageSize ?? 25)
    : 25;
  const offset = (page - 1) * pageSize;

  const where = eq(tournamentParticipants.tournamentId, options.tournamentId);

  const [totalRow] = await db
    .select({ value: count() })
    .from(tournamentParticipants)
    .where(where);

  const rows = await db
    .select({
      participantId: tournamentParticipants.id,
      status: tournamentParticipants.status,
      selectedAt: tournamentParticipants.selectedAt,
      referenceId: registrationApplications.referenceId,
      fullName: registrationApplications.fullName,
      eligible: eligibilityEvaluations.eligible,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .innerJoin(
      eligibilityEvaluations,
      eq(tournamentParticipants.eligibilityEvaluationId, eligibilityEvaluations.id),
    )
    .where(where)
    .orderBy(desc(tournamentParticipants.selectedAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map((row) => ({
      participantId: row.participantId,
      applicationReference: row.referenceId,
      applicantName: row.fullName,
      status: row.status,
      selectedAt: row.selectedAt,
      eligibilityState:
        row.status === "selected"
          ? "SELECTED"
          : row.eligible
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
    })),
    page,
    pageSize,
    total: Number(totalRow?.value ?? 0),
  };
}

export async function getParticipantCount(tournamentId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(tournamentParticipants)
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.status, "selected"),
      ),
    );
  return Number(row?.value ?? 0);
}

async function persistEligibilitySnapshot(
  evaluation: EligibilityEvaluationResult,
  evaluatorType: "system" | "admin",
  participantId?: string,
) {
  const db = getDb();
  const [row] = await db
    .insert(eligibilityEvaluations)
    .values({
      tournamentId: evaluation.tournamentId,
      applicationId: evaluation.applicationId,
      participantId: participantId ?? null,
      rulesVersion: evaluation.rulesVersion,
      eligible: evaluation.eligible,
      reasonCodes: evaluation.reasons,
      evaluatedRequirements: evaluation.evaluatedRequirements,
      evaluatorType,
    })
    .returning({ id: eligibilityEvaluations.id });

  return row.id;
}

export function formatEligibilitySummary(evaluation: EligibilityEvaluationResult): {
  state: "ELIGIBLE" | "NOT_ELIGIBLE";
  reasons: Array<{ code: string; label: string }>;
} {
  return {
    state: evaluation.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE",
    reasons: evaluation.reasons.map((code) => ({
      code,
      label: ELIGIBILITY_REASON_LABELS[code] ?? code,
    })),
  };
}

export async function selectParticipant(input: {
  tournamentId: string;
  referenceId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{
  participantId: string;
  status: "selected";
  alreadySelected: boolean;
  evaluation: EligibilityEvaluationResult;
}> {
  const loaded = await loadApplicationForEligibility(
    input.tournamentId,
    input.referenceId.toUpperCase(),
  );

  if (!loaded.tournament) {
    throw new ParticipantSelectionError("Tournament not found.", "NOT_FOUND", 404);
  }
  if (!loaded.application) {
    throw new ParticipantSelectionError("Application not found.", "NOT_FOUND", 404);
  }

  if (
    loaded.participant &&
    loaded.participant.status === "selected"
  ) {
    const evaluation = evaluateRegistrationEligibilityByReference(
      input.tournamentId,
      input.referenceId.toUpperCase(),
    );
    const evalResult = await evaluation;
    return {
      participantId: loaded.participant.id,
      status: "selected",
      alreadySelected: true,
      evaluation: evalResult ?? {
        eligible: true,
        reasons: ["ALREADY_SELECTED"],
        rulesVersion: loaded.tournament.eligibilityRulesVersion,
        evaluatedRequirements: {},
        tournamentId: input.tournamentId,
        applicationId: loaded.application.id,
        applicationReference: loaded.application.referenceId,
      },
    };
  }

  const evaluation = await evaluateRegistrationEligibilityByReference(
    input.tournamentId,
    input.referenceId.toUpperCase(),
  );

  if (!evaluation) {
    throw new ParticipantSelectionError(
      "Unable to evaluate eligibility.",
      "INTERNAL_ERROR",
      500,
    );
  }

  if (!evaluation.eligible) {
    await persistEligibilitySnapshot(evaluation, "admin");
    await recordAdminAuditEvent({
      eventType: "ELIGIBILITY_EVALUATED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      applicationId: loaded.application.id,
      applicationReference: loaded.application.referenceId,
      requestId: input.requestId,
      metadata: {
        tournamentId: input.tournamentId,
        eligible: false,
        reasonCount: evaluation.reasons.length,
      },
    });
    throw new ParticipantSelectionError(
      "Applicant is not eligible for selection.",
      "NOT_ELIGIBLE",
      400,
    );
  }

  const db = getDb();
  const selectedAt = new Date().toISOString();

  const evaluationId = await persistEligibilitySnapshot(evaluation, "admin");
  const { allocatePublicParticipantCode } = await import(
    "@/server/tournament/competition/public-code"
  );
  const publicCode = await allocatePublicParticipantCode(input.tournamentId);

  try {
    const [participant] = await db
      .insert(tournamentParticipants)
      .values({
        tournamentId: input.tournamentId,
        applicationId: loaded.application.id,
        status: "selected",
        publicCode,
        eligibilityEvaluationId: evaluationId,
        selectedAt,
      })
      .returning({ id: tournamentParticipants.id });

    await db
      .update(eligibilityEvaluations)
      .set({ participantId: participant.id })
      .where(eq(eligibilityEvaluations.id, evaluationId));

    await recordAdminAuditEvent({
      eventType: "PARTICIPANT_SELECTED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      applicationId: loaded.application.id,
      applicationReference: loaded.application.referenceId,
      requestId: input.requestId,
      metadata: {
        tournamentId: input.tournamentId,
        participantId: participant.id,
        rulesVersion: evaluation.rulesVersion,
      },
    });

    await recordAdminAuditEvent({
      eventType: "ELIGIBILITY_EVALUATED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      applicationId: loaded.application.id,
      applicationReference: loaded.application.referenceId,
      requestId: input.requestId,
      metadata: {
        tournamentId: input.tournamentId,
        eligible: true,
        rulesVersion: evaluation.rulesVersion,
      },
    });

    return {
      participantId: participant.id,
      status: "selected",
      alreadySelected: false,
      evaluation,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      const [existing] = await db
        .select({ id: tournamentParticipants.id })
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, input.tournamentId),
            eq(tournamentParticipants.applicationId, loaded.application.id),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          participantId: existing.id,
          status: "selected",
          alreadySelected: true,
          evaluation,
        };
      }
    }
    throw error;
  }
}

export async function withdrawParticipant(input: {
  tournamentId: string;
  participantId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{ status: "withdrawn"; alreadyWithdrawn: boolean }> {
  const db = getDb();
  const withdrawnAt = new Date().toISOString();

  const [existing] = await db
    .select({
      id: tournamentParticipants.id,
      status: tournamentParticipants.status,
      applicationId: tournamentParticipants.applicationId,
      referenceId: registrationApplications.referenceId,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(
      and(
        eq(tournamentParticipants.id, input.participantId),
        eq(tournamentParticipants.tournamentId, input.tournamentId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ParticipantSelectionError("Participant not found.", "NOT_FOUND", 404);
  }

  if (existing.status === "withdrawn") {
    return { status: "withdrawn", alreadyWithdrawn: true };
  }

  const [updated] = await db
    .update(tournamentParticipants)
    .set({
      status: "withdrawn",
      withdrawnAt,
      updatedAt: withdrawnAt,
    })
    .where(
      and(
        eq(tournamentParticipants.id, input.participantId),
        eq(tournamentParticipants.status, "selected"),
      ),
    )
    .returning({ id: tournamentParticipants.id });

  if (!updated) {
    throw new ParticipantSelectionError(
      "Participant cannot be withdrawn in its current state.",
      "CONFLICT",
      409,
    );
  }

  await recordAdminAuditEvent({
    eventType: "PARTICIPANT_WITHDRAWN",
    actorId: input.actorId,
    actorRole: input.actorRole,
    applicationId: existing.applicationId,
    applicationReference: existing.referenceId,
    requestId: input.requestId,
    metadata: { tournamentId: input.tournamentId, participantId: input.participantId },
  });

  return { status: "withdrawn", alreadyWithdrawn: false };
}

export async function disqualifyParticipant(input: {
  tournamentId: string;
  participantId: string;
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{ status: "disqualified"; alreadyDisqualified: boolean }> {
  const sanitizedReason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (sanitizedReason.length < 8) {
    throw new ParticipantSelectionError(
      "Disqualification reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const db = getDb();
  const disqualifiedAt = new Date().toISOString();

  const [existing] = await db
    .select({
      id: tournamentParticipants.id,
      status: tournamentParticipants.status,
      applicationId: tournamentParticipants.applicationId,
      referenceId: registrationApplications.referenceId,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(
      and(
        eq(tournamentParticipants.id, input.participantId),
        eq(tournamentParticipants.tournamentId, input.tournamentId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ParticipantSelectionError("Participant not found.", "NOT_FOUND", 404);
  }

  if (existing.status === "disqualified") {
    return { status: "disqualified", alreadyDisqualified: true };
  }

  const [updated] = await db
    .update(tournamentParticipants)
    .set({
      status: "disqualified",
      disqualifiedAt,
      disqualificationReason: sanitizedReason,
      updatedAt: disqualifiedAt,
    })
    .where(
      and(
        eq(tournamentParticipants.id, input.participantId),
        eq(tournamentParticipants.status, "selected"),
      ),
    )
    .returning({ id: tournamentParticipants.id });

  if (!updated) {
    throw new ParticipantSelectionError(
      "Participant cannot be disqualified in its current state.",
      "CONFLICT",
      409,
    );
  }

  await recordAdminAuditEvent({
    eventType: "PARTICIPANT_DISQUALIFIED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    applicationId: existing.applicationId,
    applicationReference: existing.referenceId,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      participantId: input.participantId,
      reasonLength: sanitizedReason.length,
    },
  });

  return { status: "disqualified", alreadyDisqualified: false };
}
