import { and, asc, desc, eq, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matches,
  qualificationPods,
  registrationApplications,
  tournamentParticipants,
  tournamentPhases,
} from "@/server/db/schema";
import { TOURNAMENT_DEFAULT_TIMEZONE } from "@/server/tournament/scheduling/timezone";

export type ScheduleDashboardBucket =
  | "today"
  | "upcoming"
  | "unscheduled"
  | "recently_rescheduled";

function startOfDayInLagosIso(now = new Date()): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOURNAMENT_DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = new Date(`${parts}T00:00:00+01:00`).toISOString();
  const end = new Date(`${parts}T23:59:59.999+01:00`).toISOString();
  return { start, end };
}

export async function listTournamentScheduleBoard(input: {
  tournamentId: string;
  bucket?: ScheduleDashboardBucket;
  phaseSlug?: string;
  podNumber?: number;
  date?: string;
  schedulingStatus?: string;
  matchStatus?: string;
}) {
  const db = getDb();
  const { start: todayStart, end: todayEnd } = startOfDayInLagosIso();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const conditions = [eq(matches.tournamentId, input.tournamentId)];

  if (input.phaseSlug) {
    conditions.push(eq(tournamentPhases.slug, input.phaseSlug));
  }
  if (typeof input.podNumber === "number" && Number.isFinite(input.podNumber)) {
    conditions.push(eq(qualificationPods.podNumber, input.podNumber));
  }
  if (input.schedulingStatus) {
    conditions.push(
      eq(
        matches.schedulingStatus,
        input.schedulingStatus as
          | "unscheduled"
          | "scheduled"
          | "reschedule_requested"
          | "cancelled",
      ),
    );
  }
  if (input.matchStatus) {
    conditions.push(
      eq(
        matches.status,
        input.matchStatus as
          | "scheduled"
          | "ready"
          | "live"
          | "completed"
          | "cancelled"
          | "disputed"
          | "forfeited"
          | "requires_resolution",
      ),
    );
  }
  if (input.date) {
    const dayStart = new Date(`${input.date}T00:00:00+01:00`).toISOString();
    const dayEnd = new Date(`${input.date}T23:59:59.999+01:00`).toISOString();
    conditions.push(gte(matches.scheduledAt, dayStart));
    conditions.push(lte(matches.scheduledAt, dayEnd));
  }

  if (input.bucket === "today") {
    conditions.push(gte(matches.scheduledAt, todayStart));
    conditions.push(lte(matches.scheduledAt, todayEnd));
  } else if (input.bucket === "upcoming") {
    conditions.push(isNotNull(matches.scheduledAt));
    conditions.push(gte(matches.scheduledAt, todayStart));
    conditions.push(eq(matches.schedulingStatus, "scheduled"));
  } else if (input.bucket === "unscheduled") {
    conditions.push(
      or(eq(matches.schedulingStatus, "unscheduled"), isNull(matches.scheduledAt))!,
    );
  } else if (input.bucket === "recently_rescheduled") {
    conditions.push(eq(matches.schedulingStatus, "scheduled"));
    conditions.push(isNotNull(matches.scheduleUpdatedAt));
    conditions.push(gte(matches.scheduleUpdatedAt, weekAgo));
    conditions.push(isNotNull(matches.scheduledAt));
  }

  const rows = await db
    .select({
      matchId: matches.id,
      status: matches.status,
      schedulingStatus: matches.schedulingStatus,
      scheduledAt: matches.scheduledAt,
      scheduledWindowEnd: matches.scheduledWindowEnd,
      timezone: matches.timezone,
      scheduleUpdatedAt: matches.scheduleUpdatedAt,
      phaseSlug: tournamentPhases.slug,
      phaseName: tournamentPhases.name,
      podNumber: qualificationPods.podNumber,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      publicCodeA: tournamentParticipants.publicCode,
      gamerTagA: registrationApplications.gamerTag,
    })
    .from(matches)
    .innerJoin(tournamentPhases, eq(matches.phaseId, tournamentPhases.id))
    .leftJoin(
      qualificationPods,
      eq(matches.qualificationPodId, qualificationPods.id),
    )
    .leftJoin(
      tournamentParticipants,
      eq(matches.participantAId, tournamentParticipants.id),
    )
    .leftJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(and(...conditions))
    .orderBy(asc(matches.scheduledAt), desc(matches.createdAt))
    .limit(200);

  const bIds = [
    ...new Set(
      rows
        .map((row) => row.participantBId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const bMap = new Map<string, { publicCode: string | null; gamerTag: string }>();
  if (bIds.length > 0) {
    const bRows = await db
      .select({
        id: tournamentParticipants.id,
        publicCode: tournamentParticipants.publicCode,
        gamerTag: registrationApplications.gamerTag,
      })
      .from(tournamentParticipants)
      .innerJoin(
        registrationApplications,
        eq(tournamentParticipants.applicationId, registrationApplications.id),
      )
      .where(or(...bIds.map((id) => eq(tournamentParticipants.id, id)))!);
    for (const row of bRows) {
      bMap.set(row.id, { publicCode: row.publicCode, gamerTag: row.gamerTag });
    }
  }

  return rows.map((row) => {
    const b = row.participantBId ? bMap.get(row.participantBId) : undefined;
    return {
      matchId: row.matchId,
      phase: row.phaseName,
      phaseSlug: row.phaseSlug,
      podNumber: row.podNumber,
      roundLabel: row.qualificationRound
        ? `${row.qualificationRound}${row.semifinalIndex ? ` ${row.semifinalIndex}` : ""}`
        : row.phaseSlug,
      participantA: {
        publicCode: row.publicCodeA,
        gamerTag: row.gamerTagA,
      },
      participantB: {
        publicCode: b?.publicCode ?? null,
        gamerTag: b?.gamerTag ?? null,
      },
      scheduledAt: row.scheduledAt,
      scheduledWindowEnd: row.scheduledWindowEnd,
      timezone: row.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE,
      schedulingStatus: row.schedulingStatus,
      matchStatus: row.status,
      scheduleUpdatedAt: row.scheduleUpdatedAt,
      resultState: row.status,
    };
  });
}
