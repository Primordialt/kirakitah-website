import { and, eq, ne, or, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { matches, tournaments } from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  areMatchSchedulingRulesConfigured,
  buildCompetitionPolicy,
} from "@/server/tournament/rules/competition-policy";
import {
  appendMatchScheduleHistory,
  describeNotificationBoundary,
  recordMatchNotificationEvents,
} from "@/server/tournament/scheduling/notification-service";
import {
  scheduleWindowsOverlap,
  TOURNAMENT_DEFAULT_TIMEZONE,
} from "@/server/tournament/scheduling/timezone";

export {
  describeNotificationBoundary,
  TOURNAMENT_DEFAULT_TIMEZONE as TOURNAMENT_TIMEZONE,
  TOURNAMENT_DEFAULT_TIMEZONE,
};
export {
  formatInTimezone,
  formatScheduleInAfricaLagos,
  formatTimezoneLabel,
  parseLocalDateTimeInTimezone,
  scheduleWindowsOverlap,
} from "@/server/tournament/scheduling/timezone";

/** Common IANA zones accepted for admin scheduling (extensible; not forced). */
const COMMON_IANA_TIMEZONES = new Set([
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
]);

export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== "string") return false;
  const trimmed = timezone.trim();
  if (COMMON_IANA_TIMEZONES.has(trimmed)) return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

function parseScheduledAtIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CompetitionOperationsError(
      "scheduledAt must be a valid ISO date-time.",
      "VALIDATION_ERROR",
      400,
    );
  }
  return date.toISOString();
}

async function loadMatchForScheduling(matchId: string) {
  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) {
    throw new CompetitionOperationsError("Match not found.", "NOT_FOUND", 404);
  }
  return match;
}

async function assertSchedulingRulesConfigured(tournamentId: string) {
  const db = getDb();
  const [tournament] = await db
    .select({ competitionRules: tournaments.competitionRules })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    throw new CompetitionOperationsError("Tournament not found.", "NOT_FOUND", 404);
  }

  const policy = buildCompetitionPolicy(tournament.competitionRules);
  if (!areMatchSchedulingRulesConfigured(policy)) {
    throw new CompetitionOperationsError(
      "Match scheduling rules are not configured (scheduling mode pending).",
      "MATCH_RULES_NOT_CONFIGURED",
      400,
    );
  }
  return policy;
}

/**
 * Detects direct schedule window overlaps for either participant.
 * Does NOT invent a minimum rest buffer (PENDING PRODUCT DECISION).
 */
export async function detectPlayerScheduleConflict(input: {
  matchId: string;
  tournamentId: string;
  participantAId: string | null;
  participantBId: string | null;
  scheduledAt: string;
  scheduledWindowStart?: string | null;
  scheduledWindowEnd?: string | null;
}): Promise<{ conflict: boolean; conflictingMatchId?: string }> {
  const participantIds = [input.participantAId, input.participantBId].filter(
    (id): id is string => Boolean(id),
  );
  if (participantIds.length === 0) {
    return { conflict: false };
  }

  const proposedStart = input.scheduledWindowStart ?? input.scheduledAt;
  const proposedEnd = input.scheduledWindowEnd ?? input.scheduledAt;

  const db = getDb();
  const candidates = await db
    .select({
      id: matches.id,
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      scheduledAt: matches.scheduledAt,
      scheduledWindowStart: matches.scheduledWindowStart,
      scheduledWindowEnd: matches.scheduledWindowEnd,
      schedulingStatus: matches.schedulingStatus,
      status: matches.status,
    })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, input.tournamentId),
        isNotNull(matches.scheduledAt),
        ne(matches.id, input.matchId),
        ne(matches.schedulingStatus, "cancelled"),
        ne(matches.status, "cancelled"),
      ),
    );

  for (const row of candidates) {
    const sharesParticipant =
      (row.participantAId && participantIds.includes(row.participantAId)) ||
      (row.participantBId && participantIds.includes(row.participantBId));
    if (!sharesParticipant || !row.scheduledAt) continue;

    const overlaps = scheduleWindowsOverlap({
      aStart: proposedStart,
      aEnd: proposedEnd,
      bStart: row.scheduledWindowStart ?? row.scheduledAt,
      bEnd: row.scheduledWindowEnd ?? row.scheduledAt,
    });
    if (overlaps) {
      return { conflict: true, conflictingMatchId: row.id };
    }
  }

  return { conflict: false };
}

export async function scheduleMatch(input: {
  matchId: string;
  scheduledAt: string;
  timezone: string;
  scheduledWindowStart?: string | null;
  scheduledWindowEnd?: string | null;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const match = await loadMatchForScheduling(input.matchId);
  await assertSchedulingRulesConfigured(match.tournamentId);

  if (
    match.status === "completed" ||
    match.status === "forfeited" ||
    match.status === "cancelled"
  ) {
    throw new CompetitionOperationsError(
      "Cannot schedule a completed, forfeited, or cancelled match.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (!match.participantAId || !match.participantBId) {
    throw new CompetitionOperationsError(
      "Cannot schedule until both participants are resolved.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (match.participantAId === match.participantBId) {
    throw new CompetitionOperationsError(
      "Participants must be distinct.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (!isValidIanaTimezone(input.timezone)) {
    throw new CompetitionOperationsError(
      "timezone must be a valid IANA timezone identifier.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const scheduledAt = parseScheduledAtIso(input.scheduledAt);
  const windowStart = input.scheduledWindowStart
    ? parseScheduledAtIso(input.scheduledWindowStart)
    : null;
  const windowEnd = input.scheduledWindowEnd
    ? parseScheduledAtIso(input.scheduledWindowEnd)
    : null;

  if (windowStart && windowEnd && windowStart > windowEnd) {
    throw new CompetitionOperationsError(
      "scheduledWindowStart must be before scheduledWindowEnd.",
      "VALIDATION_ERROR",
      400,
    );
  }
  if (!windowStart && windowEnd && scheduledAt > windowEnd) {
    throw new CompetitionOperationsError(
      "scheduledWindowEnd must be after scheduledAt.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (
    match.schedulingStatus === "scheduled" &&
    match.scheduledAt === scheduledAt &&
    match.timezone === input.timezone.trim()
  ) {
    return {
      matchId: match.id,
      alreadyScheduled: true,
      scheduledAt: match.scheduledAt,
      timezone: match.timezone,
    };
  }

  if (match.schedulingStatus === "scheduled" && match.scheduledAt) {
    throw new CompetitionOperationsError(
      "Match already scheduled. Use rescheduleMatch.",
      "CONFLICT",
      409,
    );
  }

  const conflict = await detectPlayerScheduleConflict({
    matchId: match.id,
    tournamentId: match.tournamentId,
    participantAId: match.participantAId,
    participantBId: match.participantBId,
    scheduledAt,
    scheduledWindowStart: windowStart,
    scheduledWindowEnd: windowEnd,
  });

  if (conflict.conflict) {
    throw new CompetitionOperationsError(
      "This participant is already scheduled for another match during this time.",
      "PLAYER_SCHEDULE_CONFLICT",
      409,
    );
  }

  const now = new Date().toISOString();
  const db = getDb();
  const [updated] = await db
    .update(matches)
    .set({
      scheduledAt,
      timezone: input.timezone.trim(),
      scheduledWindowStart: windowStart,
      scheduledWindowEnd: windowEnd,
      schedulingStatus: "scheduled",
      scheduledBy: input.actorId,
      scheduleUpdatedAt: now,
      scheduleCancelReason: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(matches.id, match.id),
        or(
          eq(matches.schedulingStatus, "unscheduled"),
          eq(matches.schedulingStatus, "cancelled"),
        ),
      ),
    )
    .returning({
      id: matches.id,
      scheduledAt: matches.scheduledAt,
      timezone: matches.timezone,
    });

  if (!updated) {
    throw new CompetitionOperationsError(
      "Match schedule changed concurrently. Retry.",
      "CONFLICT",
      409,
    );
  }

  await appendMatchScheduleHistory({
    matchId: match.id,
    tournamentId: match.tournamentId,
    action: "scheduled",
    previousScheduledAt: null,
    scheduledAt,
    scheduledWindowStart: windowStart,
    scheduledWindowEnd: windowEnd,
    timezone: input.timezone.trim(),
    actorId: input.actorId,
  });

  await recordMatchNotificationEvents({
    eventType: "MATCH_SCHEDULED",
    matchId: match.id,
    tournamentId: match.tournamentId,
    recipientParticipantIds: [match.participantAId, match.participantBId],
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
  });

  await recordAdminAuditEvent({
    eventType: "MATCH_SCHEDULED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      scheduledAt,
      timezone: input.timezone.trim(),
      rulesVersion: match.rulesVersion,
    },
  });

  return {
    matchId: match.id,
    alreadyScheduled: false,
    scheduledAt: updated.scheduledAt,
    timezone: updated.timezone,
    notification: describeNotificationBoundary("MATCH_SCHEDULED"),
  };
}

export async function rescheduleMatch(input: {
  matchId: string;
  scheduledAt: string;
  timezone: string;
  scheduledWindowStart?: string | null;
  scheduledWindowEnd?: string | null;
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const reason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (reason.length < 8) {
    throw new CompetitionOperationsError(
      "Reschedule reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const match = await loadMatchForScheduling(input.matchId);
  await assertSchedulingRulesConfigured(match.tournamentId);

  if (
    match.status === "completed" ||
    match.status === "forfeited" ||
    match.status === "cancelled"
  ) {
    throw new CompetitionOperationsError(
      "Cannot reschedule a completed, forfeited, or cancelled match.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (!match.participantAId || !match.participantBId) {
    throw new CompetitionOperationsError(
      "Cannot reschedule until both participants are resolved.",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (!isValidIanaTimezone(input.timezone)) {
    throw new CompetitionOperationsError(
      "timezone must be a valid IANA timezone identifier.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const scheduledAt = parseScheduledAtIso(input.scheduledAt);
  const windowStart = input.scheduledWindowStart
    ? parseScheduledAtIso(input.scheduledWindowStart)
    : null;
  const windowEnd = input.scheduledWindowEnd
    ? parseScheduledAtIso(input.scheduledWindowEnd)
    : null;

  if (windowStart && windowEnd && windowStart > windowEnd) {
    throw new CompetitionOperationsError(
      "scheduledWindowStart must be before scheduledWindowEnd.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const previousScheduledAt = match.scheduledAt;
  const previousWindowStart = match.scheduledWindowStart;
  const previousWindowEnd = match.scheduledWindowEnd;
  const previousTimezone = match.timezone;

  const conflict = await detectPlayerScheduleConflict({
    matchId: match.id,
    tournamentId: match.tournamentId,
    participantAId: match.participantAId,
    participantBId: match.participantBId,
    scheduledAt,
    scheduledWindowStart: windowStart,
    scheduledWindowEnd: windowEnd,
  });

  if (conflict.conflict) {
    throw new CompetitionOperationsError(
      "This participant is already scheduled for another match during this time.",
      "PLAYER_SCHEDULE_CONFLICT",
      409,
    );
  }

  const now = new Date().toISOString();
  const db = getDb();
  await db
    .update(matches)
    .set({
      scheduledAt,
      timezone: input.timezone.trim(),
      scheduledWindowStart: windowStart,
      scheduledWindowEnd: windowEnd,
      schedulingStatus: "scheduled",
      scheduledBy: input.actorId,
      scheduleUpdatedAt: now,
      scheduleCancelReason: null,
      updatedAt: now,
    })
    .where(eq(matches.id, match.id));

  await appendMatchScheduleHistory({
    matchId: match.id,
    tournamentId: match.tournamentId,
    action: "rescheduled",
    previousScheduledAt,
    previousWindowStart,
    previousWindowEnd,
    previousTimezone,
    scheduledAt,
    scheduledWindowStart: windowStart,
    scheduledWindowEnd: windowEnd,
    timezone: input.timezone.trim(),
    reason,
    actorId: input.actorId,
  });

  await recordMatchNotificationEvents({
    eventType: "MATCH_RESCHEDULED",
    matchId: match.id,
    tournamentId: match.tournamentId,
    recipientParticipantIds: [match.participantAId, match.participantBId],
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
  });

  await recordAdminAuditEvent({
    eventType: "MATCH_RESCHEDULED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      previousScheduledAt: previousScheduledAt ?? null,
      scheduledAt,
      timezone: input.timezone.trim(),
      reasonLength: reason.length,
      rulesVersion: match.rulesVersion,
    },
  });

  return {
    matchId: match.id,
    previousScheduledAt,
    scheduledAt,
    timezone: input.timezone.trim(),
    notification: describeNotificationBoundary("MATCH_RESCHEDULED"),
  };
}

export async function cancelMatchSchedule(input: {
  matchId: string;
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const reason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (reason.length < 8) {
    throw new CompetitionOperationsError(
      "Cancellation reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const match = await loadMatchForScheduling(input.matchId);

  if (match.schedulingStatus === "cancelled" && !match.scheduledAt) {
    return { matchId: match.id, alreadyCancelled: true };
  }

  if (match.status === "completed" || match.status === "forfeited") {
    throw new CompetitionOperationsError(
      "Cannot cancel schedule for a completed or forfeited match.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const now = new Date().toISOString();
  const db = getDb();
  const [updated] = await db
    .update(matches)
    .set({
      scheduledAt: null,
      scheduledWindowStart: null,
      scheduledWindowEnd: null,
      schedulingStatus: "cancelled",
      scheduleCancelReason: reason,
      scheduleUpdatedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(matches.id, match.id),
        ne(matches.schedulingStatus, "cancelled"),
      ),
    )
    .returning({ id: matches.id });

  if (!updated) {
    return { matchId: match.id, alreadyCancelled: true };
  }

  await appendMatchScheduleHistory({
    matchId: match.id,
    tournamentId: match.tournamentId,
    action: "cancelled",
    previousScheduledAt: match.scheduledAt,
    previousWindowStart: match.scheduledWindowStart,
    previousWindowEnd: match.scheduledWindowEnd,
    previousTimezone: match.timezone,
    reason,
    actorId: input.actorId,
  });

  await recordMatchNotificationEvents({
    eventType: "MATCH_CANCELLED",
    matchId: match.id,
    tournamentId: match.tournamentId,
    recipientParticipantIds: [match.participantAId, match.participantBId],
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
  });

  await recordAdminAuditEvent({
    eventType: "MATCH_SCHEDULE_CANCELLED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      reasonLength: reason.length,
      previousScheduledAt: match.scheduledAt ?? null,
    },
  });

  return {
    matchId: match.id,
    alreadyCancelled: false,
    notification: describeNotificationBoundary("MATCH_CANCELLED"),
  };
}

/** @deprecated Prefer notification-service describeNotificationBoundary */
export type MatchNotificationEvent =
  | "match_scheduled"
  | "match_rescheduled"
  | "match_cancelled"
  | "result_recorded"
  | "qualification_achieved"
  | "tournament_completed";
