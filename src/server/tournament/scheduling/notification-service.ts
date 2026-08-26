import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matchNotificationEvents,
  matchScheduleHistory,
} from "@/server/db/schema";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import type { AdminRole } from "@/server/admin/authorization/permissions";

export type MatchNotificationEventType =
  | "MATCH_SCHEDULED"
  | "MATCH_RESCHEDULED"
  | "MATCH_REMINDER"
  | "MATCH_CANCELLED";

/**
 * Records internal notification events only.
 * Email/SMS delivery remains deferred — never marks delivered without a provider.
 */
export async function recordMatchNotificationEvents(input: {
  eventType: MatchNotificationEventType;
  matchId: string;
  tournamentId: string;
  recipientParticipantIds: Array<string | null | undefined>;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  const recipients = [
    ...new Set(
      input.recipientParticipantIds.filter((id): id is string => Boolean(id)),
    ),
  ];
  if (recipients.length === 0) return { created: 0 };

  const db = getDb();
  await db.insert(matchNotificationEvents).values(
    recipients.map((participantId) => ({
      eventType: input.eventType,
      matchId: input.matchId,
      tournamentId: input.tournamentId,
      recipientParticipantId: participantId,
      deliveryStatus: "recorded" as const,
      channel: "internal",
      processedAt: new Date().toISOString(),
    })),
  );

  await recordAdminAuditEvent({
    eventType: "MATCH_NOTIFICATION_CREATED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      matchId: input.matchId,
      eventType: input.eventType,
      recipientCount: recipients.length,
      deliveryStatus: "recorded",
      channel: "internal",
      emailSms: "deferred",
    },
  });

  return { created: recipients.length };
}

export async function appendMatchScheduleHistory(input: {
  matchId: string;
  tournamentId: string;
  action: "scheduled" | "rescheduled" | "cancelled";
  previousScheduledAt?: string | null;
  previousWindowStart?: string | null;
  previousWindowEnd?: string | null;
  previousTimezone?: string | null;
  scheduledAt?: string | null;
  scheduledWindowStart?: string | null;
  scheduledWindowEnd?: string | null;
  timezone?: string | null;
  reason?: string | null;
  actorId: string;
}) {
  const db = getDb();
  await db.insert(matchScheduleHistory).values({
    matchId: input.matchId,
    tournamentId: input.tournamentId,
    action: input.action,
    previousScheduledAt: input.previousScheduledAt ?? null,
    previousWindowStart: input.previousWindowStart ?? null,
    previousWindowEnd: input.previousWindowEnd ?? null,
    previousTimezone: input.previousTimezone ?? null,
    scheduledAt: input.scheduledAt ?? null,
    scheduledWindowStart: input.scheduledWindowStart ?? null,
    scheduledWindowEnd: input.scheduledWindowEnd ?? null,
    timezone: input.timezone ?? null,
    reason: input.reason ?? null,
    actorId: input.actorId,
  });
}

export async function listMatchScheduleHistory(matchId: string) {
  const db = getDb();
  return db
    .select({
      id: matchScheduleHistory.id,
      action: matchScheduleHistory.action,
      previousScheduledAt: matchScheduleHistory.previousScheduledAt,
      scheduledAt: matchScheduleHistory.scheduledAt,
      scheduledWindowStart: matchScheduleHistory.scheduledWindowStart,
      scheduledWindowEnd: matchScheduleHistory.scheduledWindowEnd,
      timezone: matchScheduleHistory.timezone,
      reason: matchScheduleHistory.reason,
      actorId: matchScheduleHistory.actorId,
      createdAt: matchScheduleHistory.createdAt,
    })
    .from(matchScheduleHistory)
    .where(eq(matchScheduleHistory.matchId, matchId))
    .orderBy(desc(matchScheduleHistory.createdAt));
}

export async function listMatchNotificationEvents(matchId: string) {
  const db = getDb();
  return db
    .select({
      id: matchNotificationEvents.id,
      eventType: matchNotificationEvents.eventType,
      deliveryStatus: matchNotificationEvents.deliveryStatus,
      channel: matchNotificationEvents.channel,
      recipientParticipantId: matchNotificationEvents.recipientParticipantId,
      createdAt: matchNotificationEvents.createdAt,
    })
    .from(matchNotificationEvents)
    .where(eq(matchNotificationEvents.matchId, matchId))
    .orderBy(desc(matchNotificationEvents.createdAt));
}

export function describeNotificationBoundary(event: MatchNotificationEventType): {
  event: MatchNotificationEventType;
  delivery: "recorded";
  emailSms: "deferred";
  message: string;
} {
  return {
    event,
    delivery: "recorded",
    emailSms: "deferred",
    message:
      "Notification recorded internally. Email/SMS delivery remains deferred.",
  };
}
