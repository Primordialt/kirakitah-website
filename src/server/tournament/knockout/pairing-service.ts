import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  knockoutPairingParticipants,
  knockoutPairings,
  knockoutPairingSets,
  tournamentParticipants,
  tournaments,
} from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  isKnockoutPairingConfigured,
  KG926_COMPETITION_RULES_VERSION,
  KG926_KNOCKOUT_ENTRANTS,
  KG926_R32_MATCH_COUNT,
  parseCompetitionRules,
} from "@/server/tournament/competition/competition-rules";
import {
  getKnockoutPhase,
  listTop32KnockoutMembers,
  validateKnockoutReadiness,
} from "@/server/tournament/knockout/readiness-service";

export type KnockoutPairingInput = {
  slotIndex: number;
  participantAId: string;
  participantBId: string;
};

export async function getConfirmedPairingSet(tournamentId: string) {
  const db = getDb();
  const [set] = await db
    .select()
    .from(knockoutPairingSets)
    .where(
      and(
        eq(knockoutPairingSets.tournamentId, tournamentId),
        eq(knockoutPairingSets.status, "confirmed"),
      ),
    )
    .limit(1);
  return set ?? null;
}

export async function listPairingsForSet(pairingSetId: string) {
  const db = getDb();
  return db
    .select()
    .from(knockoutPairings)
    .where(eq(knockoutPairings.pairingSetId, pairingSetId))
    .orderBy(knockoutPairings.slotIndex);
}

function validatePairingShape(pairings: KnockoutPairingInput[]) {
  if (pairings.length !== KG926_R32_MATCH_COUNT) {
    throw new CompetitionOperationsError(
      `Exactly ${KG926_R32_MATCH_COUNT} Round of 32 pairings are required.`,
      "VALIDATION_ERROR",
      400,
    );
  }

  const slots = new Set<number>();
  const participants = new Set<string>();

  for (const pairing of pairings) {
    if (pairing.slotIndex < 1 || pairing.slotIndex > KG926_R32_MATCH_COUNT) {
      throw new CompetitionOperationsError(
        "Slot index must be between 1 and 16.",
        "VALIDATION_ERROR",
        400,
      );
    }
    if (slots.has(pairing.slotIndex)) {
      throw new CompetitionOperationsError(
        "Duplicate pairing slot index.",
        "VALIDATION_ERROR",
        400,
      );
    }
    slots.add(pairing.slotIndex);

    if (pairing.participantAId === pairing.participantBId) {
      throw new CompetitionOperationsError(
        "Self-match is not allowed.",
        "VALIDATION_ERROR",
        400,
      );
    }
    if (participants.has(pairing.participantAId) || participants.has(pairing.participantBId)) {
      throw new CompetitionOperationsError(
        "Each participant may appear in exactly one pairing.",
        "VALIDATION_ERROR",
        400,
      );
    }
    participants.add(pairing.participantAId);
    participants.add(pairing.participantBId);
  }

  if (participants.size !== KG926_KNOCKOUT_ENTRANTS) {
    throw new CompetitionOperationsError(
      `Pairings must include exactly ${KG926_KNOCKOUT_ENTRANTS} unique participants.`,
      "VALIDATION_ERROR",
      400,
    );
  }

  if (slots.size !== KG926_R32_MATCH_COUNT) {
    throw new CompetitionOperationsError(
      "All 16 pairing slots must be filled.",
      "VALIDATION_ERROR",
      400,
    );
  }
}

async function assertAllAreValidQualifiers(
  tournamentId: string,
  pairings: KnockoutPairingInput[],
) {
  const members = await listTop32KnockoutMembers(tournamentId);
  const validIds = new Set(
    members
      .filter((m) => m.status === "selected")
      .map((m) => m.participantId),
  );

  for (const pairing of pairings) {
    if (!validIds.has(pairing.participantAId) || !validIds.has(pairing.participantBId)) {
      throw new CompetitionOperationsError(
        "All paired participants must be valid Top 32 knockout members.",
        "VALIDATION_ERROR",
        400,
      );
    }
  }
}

/**
 * Confirms the 16 R32 pairings. Requires readiness and manual pairing strategy.
 * Does not generate matches — call generateKnockoutBracket after confirmation.
 */
export async function setKnockoutPairings(input: {
  tournamentId: string;
  pairings: KnockoutPairingInput[];
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  validatePairingShape(input.pairings);

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
  if (!isKnockoutPairingConfigured(rules)) {
    throw new CompetitionOperationsError(
      "Knockout pairing strategy is not configured for operational use.",
      "KNOCKOUT_PAIRINGS_NOT_CONFIGURED",
      400,
    );
  }

  if (tournament.knockoutBracketStatus !== "not_generated") {
    throw new CompetitionOperationsError(
      "Bracket already generated. Use reviseKnockoutPairings with a reason before regenerating.",
      "CONFLICT",
      409,
    );
  }

  const readiness = await validateKnockoutReadiness(input.tournamentId);
  if (!readiness.ready || !readiness.knockoutPhaseId) {
    throw new CompetitionOperationsError(
      readiness.reasons.join(" ") || "Knockout is not ready.",
      "KNOCKOUT_NOT_READY",
      400,
    );
  }

  await assertAllAreValidQualifiers(input.tournamentId, input.pairings);

  const existing = await getConfirmedPairingSet(input.tournamentId);
  if (existing) {
    throw new CompetitionOperationsError(
      "Confirmed pairings already exist. Use reviseKnockoutPairings to change them.",
      "CONFLICT",
      409,
    );
  }

  const phase = await getKnockoutPhase(input.tournamentId);
  if (!phase) {
    throw new CompetitionOperationsError("Knockout phase not found.", "NOT_FOUND", 404);
  }

  const now = new Date().toISOString();
  const [set] = await db
    .insert(knockoutPairingSets)
    .values({
      tournamentId: input.tournamentId,
      phaseId: phase.id,
      status: "confirmed",
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
      confirmedAt: now,
      confirmedBy: input.actorId,
    })
    .returning({ id: knockoutPairingSets.id });

  await db.insert(knockoutPairings).values(
    input.pairings.map((p) => ({
      pairingSetId: set.id,
      slotIndex: p.slotIndex,
      participantAId: p.participantAId,
      participantBId: p.participantBId,
    })),
  );

  await db.insert(knockoutPairingParticipants).values(
    input.pairings.flatMap((p) => [
      {
        pairingSetId: set.id,
        participantId: p.participantAId,
        slotIndex: p.slotIndex,
        side: "a",
      },
      {
        pairingSetId: set.id,
        participantId: p.participantBId,
        slotIndex: p.slotIndex,
        side: "b",
      },
    ]),
  );

  await recordAdminAuditEvent({
    eventType: "KNOCKOUT_PAIRINGS_CONFIGURED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      pairingSetId: set.id,
      pairingCount: input.pairings.length,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
  });

  return { pairingSetId: set.id, pairingCount: input.pairings.length };
}

/**
 * Explicit revision of confirmed pairings before bracket generation.
 * After bracket generation, pairings cannot be revised without a future correction workflow.
 */
export async function reviseKnockoutPairings(input: {
  tournamentId: string;
  pairings: KnockoutPairingInput[];
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const reason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (reason.length < 8) {
    throw new CompetitionOperationsError(
      "Revision reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  validatePairingShape(input.pairings);

  const db = getDb();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);

  if (!tournament) {
    throw new CompetitionOperationsError("Tournament not found.", "NOT_FOUND", 404);
  }

  if (tournament.knockoutBracketStatus !== "not_generated") {
    throw new CompetitionOperationsError(
      "Cannot revise pairings after bracket generation.",
      "CONFLICT",
      409,
    );
  }

  await assertAllAreValidQualifiers(input.tournamentId, input.pairings);

  const existing = await getConfirmedPairingSet(input.tournamentId);
  if (!existing) {
    throw new CompetitionOperationsError(
      "No confirmed pairings to revise. Use setKnockoutPairings first.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const phase = await getKnockoutPhase(input.tournamentId);
  if (!phase) {
    throw new CompetitionOperationsError("Knockout phase not found.", "NOT_FOUND", 404);
  }

  const now = new Date().toISOString();
  await db
    .update(knockoutPairingSets)
    .set({
      status: "superseded",
      supersededAt: now,
      changeReason: reason,
      updatedAt: now,
    })
    .where(eq(knockoutPairingSets.id, existing.id));

  const [set] = await db
    .insert(knockoutPairingSets)
    .values({
      tournamentId: input.tournamentId,
      phaseId: phase.id,
      status: "confirmed",
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
      confirmedAt: now,
      confirmedBy: input.actorId,
      changeReason: reason,
    })
    .returning({ id: knockoutPairingSets.id });

  await db.insert(knockoutPairings).values(
    input.pairings.map((p) => ({
      pairingSetId: set.id,
      slotIndex: p.slotIndex,
      participantAId: p.participantAId,
      participantBId: p.participantBId,
    })),
  );

  await db.insert(knockoutPairingParticipants).values(
    input.pairings.flatMap((p) => [
      {
        pairingSetId: set.id,
        participantId: p.participantAId,
        slotIndex: p.slotIndex,
        side: "a",
      },
      {
        pairingSetId: set.id,
        participantId: p.participantBId,
        slotIndex: p.slotIndex,
        side: "b",
      },
    ]),
  );

  await recordAdminAuditEvent({
    eventType: "KNOCKOUT_PAIRINGS_REVISED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      previousPairingSetId: existing.id,
      pairingSetId: set.id,
      reasonLength: reason.length,
      rulesVersion: KG926_COMPETITION_RULES_VERSION,
    },
  });

  return { pairingSetId: set.id, revised: true };
}

export async function getPairingAdminView(tournamentId: string) {
  const members = await listTop32KnockoutMembers(tournamentId);
  const confirmed = await getConfirmedPairingSet(tournamentId);
  const pairings = confirmed ? await listPairingsForSet(confirmed.id) : [];

  const db = getDb();
  const withCodes = await Promise.all(
    pairings.map(async (p) => {
      const [a] = await db
        .select({ publicCode: tournamentParticipants.publicCode })
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.id, p.participantAId))
        .limit(1);
      const [b] = await db
        .select({ publicCode: tournamentParticipants.publicCode })
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.id, p.participantBId))
        .limit(1);
      return {
        slotIndex: p.slotIndex,
        participantAId: p.participantAId,
        participantBId: p.participantBId,
        participantACode: a?.publicCode ?? null,
        participantBCode: b?.publicCode ?? null,
      };
    }),
  );

  return {
    qualifiers: members.map((m) => ({
      participantId: m.participantId,
      publicCode: m.publicCode,
      status: m.status,
      seed: m.seed,
    })),
    confirmedPairingSetId: confirmed?.id ?? null,
    pairings: withCodes,
  };
}
