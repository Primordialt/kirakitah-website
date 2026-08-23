import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  knockoutRounds,
  tournamentParticipants,
  tournamentPhaseParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import {
  CompetitionOperationsError,
  canTransitionPhaseStatus,
} from "@/server/tournament/competition/errors";
import { KG926_COMPETITION_RULES_VERSION } from "@/server/tournament/competition/competition-rules";

export async function listTournamentPhases(tournamentId: string) {
  const db = getDb();
  return db
    .select()
    .from(tournamentPhases)
    .where(eq(tournamentPhases.tournamentId, tournamentId))
    .orderBy(asc(tournamentPhases.sequence));
}

export async function getPhaseById(phaseId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(tournamentPhases)
    .where(eq(tournamentPhases.id, phaseId))
    .limit(1);
  return row ?? null;
}

export async function getPhaseBySlug(tournamentId: string, slug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(tournamentPhases)
    .where(
      and(
        eq(tournamentPhases.tournamentId, tournamentId),
        eq(tournamentPhases.slug, slug),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listKnockoutRounds(phaseId: string) {
  const db = getDb();
  return db
    .select()
    .from(knockoutRounds)
    .where(eq(knockoutRounds.phaseId, phaseId))
    .orderBy(asc(knockoutRounds.sequence));
}

export async function transitionPhaseStatus(input: {
  phaseId: string;
  toStatus: "draft" | "scheduled" | "active" | "completed" | "cancelled";
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const phase = await getPhaseById(input.phaseId);
  if (!phase) {
    throw new CompetitionOperationsError("Phase not found.", "NOT_FOUND", 404);
  }

  if (!canTransitionPhaseStatus(phase.status, input.toStatus)) {
    throw new CompetitionOperationsError(
      `Cannot transition phase from ${phase.status} to ${input.toStatus}.`,
      "INVALID_TRANSITION",
      409,
    );
  }

  const db = getDb();
  const now = new Date().toISOString();
  const [updated] = await db
    .update(tournamentPhases)
    .set({
      status: input.toStatus,
      updatedAt: now,
      ...(input.toStatus === "active" && !phase.startsAt
        ? { startsAt: now }
        : {}),
      ...(input.toStatus === "completed" ? { endsAt: now } : {}),
    })
    .where(
      and(
        eq(tournamentPhases.id, input.phaseId),
        eq(tournamentPhases.status, phase.status),
      ),
    )
    .returning();

  if (!updated) {
    throw new CompetitionOperationsError(
      "Phase status changed concurrently. Retry.",
      "CONFLICT",
      409,
    );
  }

  const eventType =
    input.toStatus === "active"
      ? "PHASE_STARTED"
      : input.toStatus === "completed"
        ? "PHASE_COMPLETED"
        : "PHASE_CREATED";

  if (input.toStatus === "active" || input.toStatus === "completed") {
    await recordAdminAuditEvent({
      eventType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      metadata: {
        tournamentId: phase.tournamentId,
        phaseId: phase.id,
        phaseSlug: phase.slug,
        fromStatus: phase.status,
        toStatus: input.toStatus,
      },
    });
  }

  return updated;
}

export async function addParticipantToPhase(input: {
  phaseId: string;
  participantId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
  seed?: number;
}) {
  const db = getDb();
  const phase = await getPhaseById(input.phaseId);
  if (!phase) {
    throw new CompetitionOperationsError("Phase not found.", "NOT_FOUND", 404);
  }

  const [participant] = await db
    .select()
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, input.participantId))
    .limit(1);

  if (!participant || participant.tournamentId !== phase.tournamentId) {
    throw new CompetitionOperationsError(
      "Participant does not belong to this tournament.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (participant.status !== "selected") {
    throw new CompetitionOperationsError(
      "Withdrawn or disqualified participants cannot join a phase.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (phase.participantLimit != null) {
    const [countRow] = await db
      .select({ value: count() })
      .from(tournamentPhaseParticipants)
      .where(eq(tournamentPhaseParticipants.phaseId, input.phaseId));
    if (Number(countRow?.value ?? 0) >= phase.participantLimit) {
      throw new CompetitionOperationsError(
        "Phase participant capacity reached.",
        "CAPACITY_REACHED",
        409,
      );
    }
  }

  try {
    const [row] = await db
      .insert(tournamentPhaseParticipants)
      .values({
        phaseId: input.phaseId,
        participantId: input.participantId,
        status: "active",
        seed: input.seed ?? null,
      })
      .returning();

    return { membership: row, alreadyMember: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      const [existing] = await db
        .select()
        .from(tournamentPhaseParticipants)
        .where(
          and(
            eq(tournamentPhaseParticipants.phaseId, input.phaseId),
            eq(tournamentPhaseParticipants.participantId, input.participantId),
          ),
        )
        .limit(1);
      if (existing) {
        return { membership: existing, alreadyMember: true };
      }
    }
    throw error;
  }
}

export async function listPhaseParticipants(phaseId: string) {
  const db = getDb();
  return db
    .select({
      membershipId: tournamentPhaseParticipants.id,
      participantId: tournamentPhaseParticipants.participantId,
      status: tournamentPhaseParticipants.status,
      seed: tournamentPhaseParticipants.seed,
      rank: tournamentPhaseParticipants.rank,
      qualificationPosition: tournamentPhaseParticipants.qualificationPosition,
      joinedAt: tournamentPhaseParticipants.joinedAt,
      publicCode: tournamentParticipants.publicCode,
      participantStatus: tournamentParticipants.status,
    })
    .from(tournamentPhaseParticipants)
    .innerJoin(
      tournamentParticipants,
      eq(tournamentPhaseParticipants.participantId, tournamentParticipants.id),
    )
    .where(eq(tournamentPhaseParticipants.phaseId, phaseId))
    .orderBy(asc(tournamentPhaseParticipants.joinedAt));
}

export async function ensureKg926PhasesExist(tournamentId: string) {
  const existing = await listTournamentPhases(tournamentId);
  if (existing.length > 0) return existing;

  const db = getDb();
  const [tournament] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    throw new CompetitionOperationsError("Tournament not found.", "NOT_FOUND", 404);
  }

  await db.insert(tournamentPhases).values([
    {
      tournamentId,
      name: "Qualification",
      slug: "qualification",
      phaseType: "qualification",
      sequence: 1,
      status: "draft",
      participantLimit: 128,
      qualificationTarget: 32,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
    {
      tournamentId,
      name: "Knockout",
      slug: "knockout",
      phaseType: "knockout",
      sequence: 2,
      status: "draft",
      participantLimit: 32,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
    {
      tournamentId,
      name: "Grand Final",
      slug: "grand-final",
      phaseType: "final",
      sequence: 3,
      status: "draft",
      participantLimit: 2,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
  ]);

  return listTournamentPhases(tournamentId);
}
