import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { matches } from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { assertPermission } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  canSuperAdminEditMatch,
  canSuperAdminEditMatchParticipants,
  canSuperAdminEditMatchSchedule,
} from "@/server/tournament/competition/admin-match-slot";
import { getMatchById } from "@/server/tournament/competition/match-service";
import { detectPlayerScheduleConflict } from "@/server/tournament/scheduling/scheduling-service";
import {
  parseLocalDateTimeInTimezone,
  TOURNAMENT_DEFAULT_TIMEZONE,
} from "@/server/tournament/scheduling/timezone";

async function assertParticipantEligibleForMatch(
  tournamentId: string,
  phaseId: string,
  participantId: string,
) {
  const { tournamentParticipants, tournamentPhaseParticipants } = await import(
    "@/server/db/schema"
  );
  const db = getDb();
  const [participant] = await db
    .select()
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, participantId))
    .limit(1);

  if (!participant || participant.tournamentId !== tournamentId) {
    throw new CompetitionOperationsError(
      "Participant does not belong to this tournament.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (participant.status !== "selected") {
    throw new CompetitionOperationsError(
      "Withdrawn or disqualified participants cannot be assigned to matches.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const [membership] = await db
    .select()
    .from(tournamentPhaseParticipants)
    .where(
      and(
        eq(tournamentPhaseParticipants.phaseId, phaseId),
        eq(tournamentPhaseParticipants.participantId, participantId),
      ),
    )
    .limit(1);

  if (
    !membership ||
    membership.status === "withdrawn" ||
    membership.status === "disqualified"
  ) {
    throw new CompetitionOperationsError(
      "Participant is not an active member of this phase.",
      "VALIDATION_ERROR",
      400,
    );
  }

  return participant;
}

export type MatchEditSlotInput =
  | { mode: "keep" }
  | { mode: "dependency" }
  | { mode: "participant"; participantId: string };

export async function updateMatchBySuperAdmin(input: {
  matchId: string;
  tournamentId: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
  slotA?: MatchEditSlotInput;
  slotB?: MatchEditSlotInput;
  date?: string | null;
  time?: string | null;
  timezone?: string;
}) {
  assertPermission(input.actorRole, "tournament:match_edit");

  const match = await getMatchById(input.matchId);
  if (!match || match.tournamentId !== input.tournamentId) {
    throw new CompetitionOperationsError("Match not found.", "NOT_FOUND", 404);
  }

  if (!canSuperAdminEditMatch(match.status)) {
    throw new CompetitionOperationsError(
      "Completed, forfeited, or cancelled matches cannot be edited.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const db = getDb();
  const now = new Date().toISOString();

  const updates: {
    participantAId?: string | null;
    participantBId?: string | null;
    slotAType?: "participant" | "host" | "match_winner";
    slotBType?: "participant" | "host" | "match_winner";
    dependsOnMatchAId?: string | null;
    dependsOnMatchBId?: string | null;
    scheduledAt?: string | null;
    timezone?: string;
    scheduledWindowStart?: string | null;
    schedulingStatus?: "scheduled" | "unscheduled";
    scheduleUpdatedAt?: string;
    status?: "ready" | "scheduled";
    updatedAt: string;
  } = { updatedAt: now };

  if (input.slotA && canSuperAdminEditMatchParticipants(match.status)) {
    await applySlotEdit({
      side: "A",
      slotInput: input.slotA,
      match,
      updates,
      changes,
      tournamentId: input.tournamentId,
      phaseId: match.phaseId,
    });
  } else if (input.slotA && input.slotA.mode !== "keep") {
    throw new CompetitionOperationsError(
      "Participant edits are not allowed for this match status.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (input.slotB && canSuperAdminEditMatchParticipants(match.status)) {
    await applySlotEdit({
      side: "B",
      slotInput: input.slotB,
      match,
      updates,
      changes,
      tournamentId: input.tournamentId,
      phaseId: match.phaseId,
    });
  } else if (input.slotB && input.slotB.mode !== "keep") {
    throw new CompetitionOperationsError(
      "Participant edits are not allowed for this match status.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const nextParticipantAId =
    updates.participantAId !== undefined
      ? updates.participantAId
      : match.participantAId;
  const nextParticipantBId =
    updates.participantBId !== undefined
      ? updates.participantBId
      : match.participantBId;

  if (
    nextParticipantAId &&
    nextParticipantBId &&
    nextParticipantAId === nextParticipantBId
  ) {
    throw new CompetitionOperationsError(
      "A match requires two distinct participants.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const nextSlotAType = updates.slotAType ?? match.slotAType ?? "participant";
  const nextSlotBType = updates.slotBType ?? match.slotBType ?? "participant";

  if (nextSlotAType !== "host" && nextSlotBType !== "host") {
    if (nextParticipantAId && nextParticipantBId) {
      updates.status = "ready";
    } else if (match.status === "ready") {
      updates.status = "scheduled";
    }
  }

  if (
    canSuperAdminEditMatchSchedule(match.status) &&
    input.date &&
    input.time
  ) {
    const timezone = (input.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE).trim();
    if (timezone !== TOURNAMENT_DEFAULT_TIMEZONE && timezone !== "UTC") {
      throw new CompetitionOperationsError(
        "Only Africa/Lagos and UTC timezones are supported for match editing.",
        "VALIDATION_ERROR",
        400,
      );
    }

    let scheduledAt: string;
    try {
      scheduledAt = parseLocalDateTimeInTimezone({
        date: input.date,
        time: input.time,
        timezone,
      });
    } catch {
      throw new CompetitionOperationsError(
        "Invalid date or time.",
        "VALIDATION_ERROR",
        400,
      );
    }

    const conflict = await detectPlayerScheduleConflict({
      matchId: match.id,
      tournamentId: match.tournamentId,
      participantAId: nextParticipantAId,
      participantBId: nextParticipantBId,
      scheduledAt,
      scheduledWindowStart: scheduledAt,
      scheduledWindowEnd: null,
    });

    if (conflict.conflict) {
      throw new CompetitionOperationsError(
        "This participant is already scheduled for another match during this time.",
        "PLAYER_SCHEDULE_CONFLICT",
        409,
      );
    }

    if (match.scheduledAt !== scheduledAt) {
      changes.scheduledAt = { from: match.scheduledAt, to: scheduledAt };
    }
    if ((match.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE) !== timezone) {
      changes.timezone = {
        from: match.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE,
        to: timezone,
      };
    }

    updates.scheduledAt = scheduledAt;
    updates.timezone = timezone;
    updates.scheduledWindowStart = scheduledAt;
    updates.schedulingStatus = "scheduled";
    updates.scheduleUpdatedAt = now;
  }

  const hasChanges = Object.keys(changes).length > 0;
  if (!hasChanges) {
    return { matchId: match.id, changed: false };
  }

  await db.update(matches).set(updates).where(eq(matches.id, match.id));

  const auditMetadata: Record<string, string | number | boolean | null> = {
    tournamentId: input.tournamentId,
    matchId: match.id,
  };
  for (const [field, diff] of Object.entries(changes)) {
    auditMetadata[`${field}_from`] =
      diff.from == null ? null : String(diff.from);
    auditMetadata[`${field}_to`] = diff.to == null ? null : String(diff.to);
  }

  await recordAdminAuditEvent({
    eventType: "MATCH_EDITED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: auditMetadata,
  });

  return { matchId: match.id, changed: true, changes };
}

async function applySlotEdit(input: {
  side: "A" | "B";
  slotInput: MatchEditSlotInput;
  match: NonNullable<Awaited<ReturnType<typeof getMatchById>>>;
  updates: Record<string, unknown>;
  changes: Record<string, { from: unknown; to: unknown }>;
  tournamentId: string;
  phaseId: string;
}) {
  const slotTypeKey = input.side === "A" ? "slotAType" : "slotBType";
  const participantKey = input.side === "A" ? "participantAId" : "participantBId";
  const dependsKey = input.side === "A" ? "dependsOnMatchAId" : "dependsOnMatchBId";
  const changeKey = input.side === "A" ? "participantA" : "participantB";

  const currentSlotType = input.match[slotTypeKey] ?? "participant";
  const currentParticipantId = input.match[participantKey];
  const currentDependsOn = input.match[dependsKey];

  if (currentSlotType === "host") {
    throw new CompetitionOperationsError(
      "HOST slots cannot be edited.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (input.slotInput.mode === "keep") {
    return;
  }

  if (input.slotInput.mode === "dependency") {
    if (!currentDependsOn) {
      throw new CompetitionOperationsError(
        "This slot has no upstream match dependency to preserve.",
        "VALIDATION_ERROR",
        400,
      );
    }
    return;
  }

  const participantId = input.slotInput.participantId;
  await assertParticipantEligibleForMatch(
    input.tournamentId,
    input.phaseId,
    participantId,
  );

  input.updates[participantKey] = participantId;
  input.updates[slotTypeKey] = "participant";
  input.updates[dependsKey] = null;

  input.changes[changeKey] = {
    from: currentParticipantId ?? currentDependsOn,
    to: participantId,
  };
}
