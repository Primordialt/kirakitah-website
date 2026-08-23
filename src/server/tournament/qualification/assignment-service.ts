import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  qualificationPodMembers,
  tournamentParticipants,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  getPodById,
  getPodByNumber,
  getQualificationPhase,
  updatePodStatusFromMembers,
} from "@/server/tournament/qualification/pod-service";

async function assertParticipantAssignable(
  tournamentId: string,
  phaseId: string,
  participantId: string,
) {
  const db = getDb();
  const [participant] = await db
    .select()
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, participantId))
    .limit(1);

  if (!participant || participant.tournamentId !== tournamentId) {
    throw new CompetitionOperationsError(
      "Participant not found in this tournament.",
      "NOT_FOUND",
      404,
    );
  }

  if (participant.status !== "selected") {
    throw new CompetitionOperationsError(
      "Withdrawn or disqualified participants cannot be assigned to pods.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const [existingInPhase] = await db
    .select({ podId: qualificationPodMembers.podId })
    .from(qualificationPodMembers)
    .where(
      and(
        eq(qualificationPodMembers.phaseId, phaseId),
        eq(qualificationPodMembers.participantId, participantId),
      ),
    )
    .limit(1);

  return { participant, existingInPhase: existingInPhase ?? null };
}

export async function assignParticipantToPod(input: {
  tournamentId: string;
  podNumber: number;
  participantId: string;
  positionNumber: number;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<{ assigned: boolean; alreadyAssigned: boolean; podId: string }> {
  if (input.positionNumber < 1 || input.positionNumber > 4) {
    throw new CompetitionOperationsError(
      "Position must be between 1 and 4.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const phase = await getQualificationPhase(input.tournamentId);
  const pod = await getPodByNumber(input.tournamentId, input.podNumber);
  if (!pod) {
    throw new CompetitionOperationsError("Pod not found.", "NOT_FOUND", 404);
  }

  if (pod.status === "completed" || pod.status === "cancelled") {
    throw new CompetitionOperationsError(
      "Cannot assign to a completed or cancelled pod.",
      "CONFLICT",
      409,
    );
  }

  const { existingInPhase } = await assertParticipantAssignable(
    input.tournamentId,
    phase.id,
    input.participantId,
  );

  if (
    existingInPhase &&
    existingInPhase.podId !== pod.id
  ) {
    throw new CompetitionOperationsError(
      "Participant is already assigned to another pod. Use reassignment.",
      "CONFLICT",
      409,
    );
  }

  const db = getDb();

  const [phaseMemberCount] = await db
    .select({ value: count() })
    .from(qualificationPodMembers)
    .where(eq(qualificationPodMembers.phaseId, phase.id));

  if (Number(phaseMemberCount?.value ?? 0) >= 128 && !existingInPhase) {
    throw new CompetitionOperationsError(
      "Qualification participant limit (128) reached.",
      "CAPACITY_REACHED",
      409,
    );
  }

  const [podMemberCount] = await db
    .select({ value: count() })
    .from(qualificationPodMembers)
    .where(eq(qualificationPodMembers.podId, pod.id));

  const [existingAtPosition] = await db
    .select({ id: qualificationPodMembers.id, participantId: qualificationPodMembers.participantId })
    .from(qualificationPodMembers)
    .where(
      and(
        eq(qualificationPodMembers.podId, pod.id),
        eq(qualificationPodMembers.positionNumber, input.positionNumber),
      ),
    )
    .limit(1);

  if (existingAtPosition && existingAtPosition.participantId === input.participantId) {
    return { assigned: true, alreadyAssigned: true, podId: pod.id };
  }

  if (existingAtPosition) {
    throw new CompetitionOperationsError(
      "Position is already occupied. Use reassignment.",
      "CONFLICT",
      409,
    );
  }

  if (
    !existingInPhase &&
    Number(podMemberCount?.value ?? 0) >= pod.capacity
  ) {
    throw new CompetitionOperationsError(
      "Pod capacity (4) reached.",
      "CAPACITY_REACHED",
      409,
    );
  }

  try {
    await db.insert(qualificationPodMembers).values({
      podId: pod.id,
      phaseId: phase.id,
      participantId: input.participantId,
      positionNumber: input.positionNumber,
    });

    await recordAdminAuditEvent({
      eventType: "QUALIFICATION_PARTICIPANT_ASSIGNED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      metadata: {
        tournamentId: input.tournamentId,
        podId: pod.id,
        podNumber: pod.podNumber,
        participantId: input.participantId,
        positionNumber: input.positionNumber,
      },
    });

    await updatePodStatusFromMembers(pod.id);
    return { assigned: true, alreadyAssigned: false, podId: pod.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      const [existing] = await db
        .select({ podId: qualificationPodMembers.podId })
        .from(qualificationPodMembers)
        .where(
          and(
            eq(qualificationPodMembers.phaseId, phase.id),
            eq(qualificationPodMembers.participantId, input.participantId),
          ),
        )
        .limit(1);
      if (existing?.podId === pod.id) {
        return { assigned: true, alreadyAssigned: true, podId: pod.id };
      }
    }
    throw error;
  }
}

export async function reassignParticipantToPod(input: {
  tournamentId: string;
  podNumber: number;
  participantId: string;
  positionNumber: number;
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const sanitizedReason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (sanitizedReason.length < 8) {
    throw new CompetitionOperationsError(
      "Reassignment reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const phase = await getQualificationPhase(input.tournamentId);
  const pod = await getPodByNumber(input.tournamentId, input.podNumber);
  if (!pod) {
    throw new CompetitionOperationsError("Pod not found.", "NOT_FOUND", 404);
  }

  if (pod.status === "completed") {
    throw new CompetitionOperationsError(
      "Cannot reassign in a completed pod.",
      "CONFLICT",
      409,
    );
  }

  await assertParticipantAssignable(input.tournamentId, phase.id, input.participantId);

  const db = getDb();
  await db
    .delete(qualificationPodMembers)
    .where(
      and(
        eq(qualificationPodMembers.phaseId, phase.id),
        eq(qualificationPodMembers.participantId, input.participantId),
      ),
    );

  const [occupied] = await db
    .select({ id: qualificationPodMembers.id })
    .from(qualificationPodMembers)
    .where(
      and(
        eq(qualificationPodMembers.podId, pod.id),
        eq(qualificationPodMembers.positionNumber, input.positionNumber),
      ),
    )
    .limit(1);

  if (occupied) {
    throw new CompetitionOperationsError(
      "Target position is occupied.",
      "CONFLICT",
      409,
    );
  }

  await db.insert(qualificationPodMembers).values({
    podId: pod.id,
    phaseId: phase.id,
    participantId: input.participantId,
    positionNumber: input.positionNumber,
  });

  await recordAdminAuditEvent({
    eventType: "QUALIFICATION_PARTICIPANT_REASSIGNED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      podId: pod.id,
      podNumber: pod.podNumber,
      participantId: input.participantId,
      positionNumber: input.positionNumber,
      reasonLength: sanitizedReason.length,
    },
  });

  await updatePodStatusFromMembers(pod.id);
  return { podId: pod.id, reassigned: true };
}

export async function removeParticipantFromPod(input: {
  podId: string;
  participantId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const pod = await getPodById(input.podId);
  if (!pod || pod.status === "completed") {
    throw new CompetitionOperationsError("Pod not available.", "CONFLICT", 409);
  }

  const db = getDb();
  await db
    .delete(qualificationPodMembers)
    .where(
      and(
        eq(qualificationPodMembers.podId, input.podId),
        eq(qualificationPodMembers.participantId, input.participantId),
      ),
    );

  await updatePodStatusFromMembers(input.podId);
  return { removed: true };
}
