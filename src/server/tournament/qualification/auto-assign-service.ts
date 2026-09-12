import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import pg from "pg";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { getDb } from "@/server/db";
import {
  matches,
  qualificationPodMembers,
  qualificationPods,
  registrationApplications,
  tournamentParticipants,
} from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  KG926_QUALIFICATION_ENTRANTS,
  KG926_QUALIFICATION_POD_COUNT,
} from "@/server/tournament/competition/competition-rules";
import {
  ensureQualificationPods,
  getQualificationPhase,
  updatePodStatusFromMembers,
} from "@/server/tournament/qualification/pod-service";

export type AutoAssignResult = {
  participantsAssigned: number;
  podsFilled: number;
  positionsRemaining: number;
  alreadyAssigned: number;
  unassignedEligibleRemaining: number;
  message: string;
};

type PendingAssignment = {
  podId: string;
  podNumber: number;
  positionNumber: number;
  participantId: string;
};

async function listUnassignedSelectedParticipantIds(
  tournamentId: string,
  phaseId: string,
): Promise<string[]> {
  const db = getDb();
  const assignedRows = await db
    .select({ participantId: qualificationPodMembers.participantId })
    .from(qualificationPodMembers)
    .where(eq(qualificationPodMembers.phaseId, phaseId));

  const assignedIds = assignedRows.map((row) => row.participantId);

  const baseQuery = db
    .select({ id: tournamentParticipants.id })
    .from(tournamentParticipants)
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.status, "selected"),
        assignedIds.length > 0
          ? notInArray(tournamentParticipants.id, assignedIds)
          : sql`true`,
      ),
    )
    .orderBy(asc(tournamentParticipants.publicCode));

  const rows = await baseQuery;
  return rows.map((row) => row.id);
}

async function listAvailableSlots(tournamentId: string, phaseId: string) {
  const db = getDb();
  const pods = await db
    .select()
    .from(qualificationPods)
    .where(
      and(
        eq(qualificationPods.tournamentId, tournamentId),
        eq(qualificationPods.phaseId, phaseId),
      ),
    )
    .orderBy(asc(qualificationPods.podNumber));

  if (pods.length === 0) return [];

  const podIds = pods.map((pod) => pod.id);
  const podsWithMatches = await db
    .selectDistinct({ podId: matches.qualificationPodId })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        inArray(matches.qualificationPodId, podIds),
      ),
    );

  const matchPodIds = new Set(
    podsWithMatches
      .map((row) => row.podId)
      .filter((id): id is string => Boolean(id)),
  );

  const memberRows = await db
    .select({
      podId: qualificationPodMembers.podId,
      positionNumber: qualificationPodMembers.positionNumber,
    })
    .from(qualificationPodMembers)
    .where(inArray(qualificationPodMembers.podId, podIds));

  const occupiedByPod = new Map<string, Set<number>>();
  for (const row of memberRows) {
    const set = occupiedByPod.get(row.podId) ?? new Set<number>();
    set.add(row.positionNumber);
    occupiedByPod.set(row.podId, set);
  }

  const slots: Array<{ podId: string; podNumber: number; positionNumber: number }> =
    [];

  for (const pod of pods) {
    if (pod.status === "completed" || pod.status === "cancelled") continue;
    if (matchPodIds.has(pod.id)) continue;

    const occupied = occupiedByPod.get(pod.id) ?? new Set<number>();
    for (let position = 1; position <= pod.capacity; position += 1) {
      if (!occupied.has(position)) {
        slots.push({
          podId: pod.id,
          podNumber: pod.podNumber,
          positionNumber: position,
        });
      }
    }
  }

  return slots;
}

export function buildAssignmentPlan(
  participantIds: string[],
  slots: Array<{ podId: string; podNumber: number; positionNumber: number }>,
): PendingAssignment[] {
  const count = Math.min(participantIds.length, slots.length);
  const plan: PendingAssignment[] = [];
  for (let i = 0; i < count; i += 1) {
    plan.push({
      podId: slots[i]!.podId,
      podNumber: slots[i]!.podNumber,
      positionNumber: slots[i]!.positionNumber,
      participantId: participantIds[i]!,
    });
  }
  return plan;
}

async function notifyParticipantAssigned(
  participantId: string,
  tournamentId: string,
  podNumber: number,
  actorId: string,
) {
  const db = getDb();
  const [participantRow] = await db
    .select({ applicationId: tournamentParticipants.applicationId })
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, participantId))
    .limit(1);
  if (!participantRow?.applicationId) return;

  const [application] = await db
    .select({ participantAccountId: registrationApplications.participantAccountId })
    .from(registrationApplications)
    .where(eq(registrationApplications.id, participantRow.applicationId))
    .limit(1);
  if (!application?.participantAccountId) return;

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_QUALIFICATION_ASSIGNED",
    accountId: application.participantAccountId,
    actor: actorId,
    metadata: { tournamentId, podNumber },
  });
}

/**
 * Atomically assigns eligible selected participants into available pod positions.
 * Preserves existing assignments; never overwrites occupied positions.
 */
export async function autoAssignParticipantsToPods(input: {
  tournamentId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}): Promise<AutoAssignResult> {
  const databaseUrl = serverEnv.databaseUrl;
  if (!databaseUrl) {
    throw new CompetitionOperationsError(
      "Database is not configured.",
      "CONFIGURATION_UNAVAILABLE",
      503,
    );
  }

  await ensureQualificationPods(input.tournamentId);
  const phase = await getQualificationPhase(input.tournamentId);
  const db = getDb();

  const [assignedCountRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(qualificationPodMembers)
    .where(eq(qualificationPodMembers.phaseId, phase.id));
  const alreadyAssigned = Number(assignedCountRow?.value ?? 0);

  const unassignedIds = await listUnassignedSelectedParticipantIds(
    input.tournamentId,
    phase.id,
  );
  const slots = await listAvailableSlots(input.tournamentId, phase.id);
  const plan = buildAssignmentPlan(unassignedIds, slots);

  if (plan.length === 0) {
    const positionsRemaining = slots.length;
    const unassignedEligibleRemaining = unassignedIds.length;
    let message = "No new participants were assigned.";
    if (unassignedEligibleRemaining > 0 && positionsRemaining === 0) {
      message =
        "Some eligible participants could not be assigned because all pod positions are full.";
    }
    return {
      participantsAssigned: 0,
      podsFilled: 0,
      positionsRemaining,
      alreadyAssigned,
      unassignedEligibleRemaining,
      message,
    };
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `qual_auto_assign:${input.tournamentId}`,
    ]);

    const freshUnassigned = await listUnassignedSelectedParticipantIds(
      input.tournamentId,
      phase.id,
    );
    const freshSlots = await listAvailableSlots(input.tournamentId, phase.id);
    const freshPlan = buildAssignmentPlan(freshUnassigned, freshSlots);

    if (freshPlan.length === 0) {
      await client.query("COMMIT");
      return {
        participantsAssigned: 0,
        podsFilled: 0,
        positionsRemaining: freshSlots.length,
        alreadyAssigned,
        unassignedEligibleRemaining: freshUnassigned.length,
        message: "No new participants were assigned.",
      };
    }

    for (const assignment of freshPlan) {
      await client.query(
        `INSERT INTO qualification_pod_members (pod_id, phase_id, participant_id, position_number)
         VALUES ($1, $2, $3, $4)`,
        [
          assignment.podId,
          phase.id,
          assignment.participantId,
          assignment.positionNumber,
        ],
      );
    }

    await client.query("COMMIT");

    const affectedPodIds = [...new Set(freshPlan.map((row) => row.podId))];
    for (const podId of affectedPodIds) {
      await updatePodStatusFromMembers(podId);
    }

    for (const assignment of freshPlan) {
      await notifyParticipantAssigned(
        assignment.participantId,
        input.tournamentId,
        assignment.podNumber,
        input.actorId,
      );
    }

    const podsAfter = await db
      .select({
        podId: qualificationPods.id,
        capacity: qualificationPods.capacity,
        memberCount: sql<number>`count(${qualificationPodMembers.id})::int`,
      })
      .from(qualificationPods)
      .leftJoin(
        qualificationPodMembers,
        eq(qualificationPodMembers.podId, qualificationPods.id),
      )
      .where(eq(qualificationPods.phaseId, phase.id))
      .groupBy(qualificationPods.id, qualificationPods.capacity);

    const podsFilled = podsAfter.filter(
      (pod) => Number(pod.memberCount) >= pod.capacity,
    ).length;

    const remainingSlots = await listAvailableSlots(input.tournamentId, phase.id);
    const remainingUnassigned = await listUnassignedSelectedParticipantIds(
      input.tournamentId,
      phase.id,
    );

    let message = `Assigned ${freshPlan.length} participant(s).`;
    if (remainingUnassigned.length > 0 && remainingSlots.length === 0) {
      message +=
        " Some eligible participants could not be assigned because all pod positions are full.";
    } else if (freshPlan.length === 0) {
      message = "No new participants were assigned.";
    }

    await recordAdminAuditEvent({
      eventType: "QUALIFICATION_AUTO_ASSIGN_COMPLETED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      metadata: {
        tournamentId: input.tournamentId,
        participantsAssigned: freshPlan.length,
        podsFilled,
        positionsRemaining: remainingSlots.length,
        alreadyAssigned,
        podsAffected: affectedPodIds.length,
      },
    });

    return {
      participantsAssigned: freshPlan.length,
      podsFilled,
      positionsRemaining: remainingSlots.length,
      alreadyAssigned,
      unassignedEligibleRemaining: remainingUnassigned.length,
      message,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      throw new CompetitionOperationsError(
        "Auto assign conflict — another administrator may have updated pod assignments. Refresh and try again.",
        "CONFLICT",
        409,
      );
    }
    throw error;
  } finally {
    await client.end();
  }
}

export async function countQualificationCapacityTargets(tournamentId: string) {
  await ensureQualificationPods(tournamentId);
  return {
    maxPods: KG926_QUALIFICATION_POD_COUNT,
    maxPositions: KG926_QUALIFICATION_ENTRANTS,
  };
}
