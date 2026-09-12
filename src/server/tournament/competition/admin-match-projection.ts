import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  knockoutRounds,
  matches,
  participantAccounts,
  qualificationPodMembers,
  qualificationPods,
  registrationApplications,
  tournamentParticipants,
  tournamentPhases,
} from "@/server/db/schema";
import {
  areBothMatchParticipantsReady,
  canSuperAdminEditMatch,
  canSuperAdminEditMatchParticipants,
  canSuperAdminEditMatchSchedule,
  resolveAdminMatchSlot,
  type AdminMatchSlotProjection,
  type DependencyMatchInfo,
  type ParticipantDisplayInfo,
} from "@/server/tournament/competition/admin-match-slot";
import {
  formatScheduleInAfricaLagos,
  formatTimezoneLabel,
  TOURNAMENT_DEFAULT_TIMEZONE,
} from "@/server/tournament/scheduling/timezone";

export type AdminMatchProjection = {
  matchId: string;
  matchShortId: string;
  matchNumber: number | null;
  tournamentId: string;
  phaseName: string;
  phaseSlug: string;
  podNumber: number | null;
  roundLabel: string;
  knockoutRoundName: string | null;
  slotA: AdminMatchSlotProjection;
  slotB: AdminMatchSlotProjection;
  status: string;
  schedulingStatus: string;
  scheduledAt: string | null;
  timezone: string;
  scheduledDisplay: string;
  scheduledDateDisplay: string;
  scheduledTimeDisplay: string;
  timezoneLabel: string;
  participantsReady: boolean;
  matchResolved: boolean;
  editable: boolean;
  editableParticipants: boolean;
  editableSchedule: boolean;
};

export type ListAdminMatchesFilters = {
  tournamentId: string;
  status?: string;
  schedulingStatus?: string;
  phaseSlug?: string;
  podNumber?: number;
  date?: string;
  participantQuery?: string;
  matchIdQuery?: string;
  page?: number;
  pageSize?: number;
};

function formatScheduleParts(
  iso: string | null | undefined,
  timezone: string,
): { date: string; time: string; full: string } {
  if (!iso) {
    return { date: "—", time: "—", full: "—" };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: "—", time: "—", full: "—" };
  }

  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = get(dateParts, "day");
  const month = get(dateParts, "month");
  const year = get(dateParts, "year");
  const hour = get(timeParts, "hour");
  const minute = get(timeParts, "minute");
  const dayPeriod = get(timeParts, "dayPeriod").toUpperCase();
  const tzSuffix = timezone === "Africa/Lagos" ? "WAT" : timezone;

  return {
    date: `${day} ${month} ${year}`,
    time: `${hour}:${minute} ${dayPeriod} ${tzSuffix}`,
    full:
      timezone === TOURNAMENT_DEFAULT_TIMEZONE
        ? formatScheduleInAfricaLagos(iso)
        : `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} (${timezone})`,
  };
}

function buildRoundLabel(row: {
  qualificationRound: string | null;
  semifinalIndex: number | null;
  phaseSlug: string;
  knockoutRoundName: string | null;
  bracketSlotIndex: number | null;
}): string {
  if (row.knockoutRoundName) {
    return row.bracketSlotIndex != null
      ? `${row.knockoutRoundName} · Slot ${row.bracketSlotIndex}`
      : row.knockoutRoundName;
  }
  if (row.qualificationRound) {
    return `${row.qualificationRound}${
      row.semifinalIndex ? ` ${row.semifinalIndex}` : ""
    }`;
  }
  return row.phaseSlug;
}

export async function listAdminMatchProjections(
  filters: ListAdminMatchesFilters,
): Promise<{ items: AdminMatchProjection[]; page: number; pageSize: number }> {
  const db = getDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = [10, 25, 50, 100].includes(filters.pageSize ?? 25)
    ? (filters.pageSize ?? 25)
    : 25;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(matches.tournamentId, filters.tournamentId)];

  if (filters.status) {
    conditions.push(
      eq(
        matches.status,
        filters.status as
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
  if (filters.schedulingStatus) {
    conditions.push(
      eq(
        matches.schedulingStatus,
        filters.schedulingStatus as
          | "unscheduled"
          | "scheduled"
          | "reschedule_requested"
          | "cancelled",
      ),
    );
  }
  if (filters.phaseSlug) {
    conditions.push(eq(tournamentPhases.slug, filters.phaseSlug));
  }
  if (typeof filters.podNumber === "number" && Number.isFinite(filters.podNumber)) {
    conditions.push(eq(qualificationPods.podNumber, filters.podNumber));
  }
  if (filters.date) {
    const dayStart = new Date(`${filters.date}T00:00:00+01:00`).toISOString();
    const dayEnd = new Date(`${filters.date}T23:59:59.999+01:00`).toISOString();
    conditions.push(gte(matches.scheduledAt, dayStart));
    conditions.push(lte(matches.scheduledAt, dayEnd));
  }
  if (filters.matchIdQuery?.trim()) {
    conditions.push(ilike(matches.id, `${filters.matchIdQuery.trim()}%`));
  }
  if (filters.participantQuery?.trim()) {
    const needle = `%${filters.participantQuery.trim()}%`;
    const matchingParticipants = await db
      .select({ id: tournamentParticipants.id })
      .from(tournamentParticipants)
      .innerJoin(
        registrationApplications,
        eq(tournamentParticipants.applicationId, registrationApplications.id),
      )
      .leftJoin(
        participantAccounts,
        eq(registrationApplications.participantAccountId, participantAccounts.id),
      )
      .where(
        and(
          eq(tournamentParticipants.tournamentId, filters.tournamentId),
          or(
            ilike(registrationApplications.gamerTag, needle),
            ilike(tournamentParticipants.publicCode, needle),
            ilike(participantAccounts.username, needle),
          ),
        ),
      );
    const ids = matchingParticipants.map((row) => row.id);
    if (ids.length === 0) {
      return { items: [], page, pageSize };
    }
    conditions.push(
      or(
        inArray(matches.participantAId, ids),
        inArray(matches.participantBId, ids),
      )!,
    );
  }

  const rows = await db
    .select({
      id: matches.id,
      tournamentId: matches.tournamentId,
      status: matches.status,
      schedulingStatus: matches.schedulingStatus,
      scheduledAt: matches.scheduledAt,
      timezone: matches.timezone,
      slotAType: matches.slotAType,
      slotBType: matches.slotBType,
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      dependsOnMatchAId: matches.dependsOnMatchAId,
      dependsOnMatchBId: matches.dependsOnMatchBId,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      bracketSlotIndex: matches.bracketSlotIndex,
      phaseName: tournamentPhases.name,
      phaseSlug: tournamentPhases.slug,
      podNumber: qualificationPods.podNumber,
      knockoutRoundName: knockoutRounds.name,
    })
    .from(matches)
    .innerJoin(tournamentPhases, eq(matches.phaseId, tournamentPhases.id))
    .leftJoin(qualificationPods, eq(matches.qualificationPodId, qualificationPods.id))
    .leftJoin(knockoutRounds, eq(matches.knockoutRoundId, knockoutRounds.id))
    .where(and(...conditions))
    .orderBy(
      sql`CASE WHEN ${matches.scheduledAt} IS NULL THEN 1 ELSE 0 END`,
      asc(matches.scheduledAt),
      desc(matches.createdAt),
    )
    .limit(pageSize)
    .offset(offset);

  const participantIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.participantAId, row.participantBId])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const dependencyIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.dependsOnMatchAId, row.dependsOnMatchBId])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const participantMap = await loadParticipantDisplayMap(participantIds);
  const dependencyMap = await loadDependencyMatchMap(dependencyIds);

  const items = rows.map((row) =>
    projectAdminMatchRow(row, participantMap, dependencyMap),
  );

  return { items, page, pageSize };
}

function projectAdminMatchRow(
  row: {
    id: string;
    tournamentId: string;
    status: string;
    schedulingStatus: string;
    scheduledAt: string | null;
    timezone: string | null;
    slotAType: "participant" | "host" | "match_winner" | null;
    slotBType: "participant" | "host" | "match_winner" | null;
    participantAId: string | null;
    participantBId: string | null;
    dependsOnMatchAId: string | null;
    dependsOnMatchBId: string | null;
    qualificationRound: string | null;
    semifinalIndex: number | null;
    bracketSlotIndex: number | null;
    phaseName: string;
    phaseSlug: string;
    podNumber: number | null;
    knockoutRoundName: string | null;
  },
  participantMap: Map<string, ParticipantDisplayInfo>,
  dependencyMap: Map<string, DependencyMatchInfo>,
): AdminMatchProjection {
  const timezone = row.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE;
  const scheduleParts = formatScheduleParts(row.scheduledAt, timezone);
  const roundLabel = buildRoundLabel({
    qualificationRound: row.qualificationRound,
    semifinalIndex: row.semifinalIndex,
    phaseSlug: row.phaseSlug,
    knockoutRoundName: row.knockoutRoundName,
    bracketSlotIndex: row.bracketSlotIndex,
  });

  const slotA = resolveAdminMatchSlot({
    slotType: row.slotAType,
    participantId: row.participantAId,
    dependsOnMatchId: row.dependsOnMatchAId,
    participant: row.participantAId
      ? participantMap.get(row.participantAId)
      : null,
    dependencyMatch: row.dependsOnMatchAId
      ? dependencyMap.get(row.dependsOnMatchAId)
      : null,
  });

  const slotB = resolveAdminMatchSlot({
    slotType: row.slotBType,
    participantId: row.participantBId,
    dependsOnMatchId: row.dependsOnMatchBId,
    participant: row.participantBId
      ? participantMap.get(row.participantBId)
      : null,
    dependencyMatch: row.dependsOnMatchBId
      ? dependencyMap.get(row.dependsOnMatchBId)
      : null,
  });

  const matchResolved =
    row.status === "completed" ||
    row.status === "forfeited" ||
    row.status === "cancelled";

  return {
    matchId: row.id,
    matchShortId: row.id.slice(0, 8),
    matchNumber: row.bracketSlotIndex,
    tournamentId: row.tournamentId,
    phaseName: row.phaseName,
    phaseSlug: row.phaseSlug,
    podNumber: row.podNumber,
    roundLabel,
    knockoutRoundName: row.knockoutRoundName,
    slotA,
    slotB,
    status: row.status,
    schedulingStatus: row.schedulingStatus,
    scheduledAt: row.scheduledAt,
    timezone,
    scheduledDisplay: scheduleParts.full,
    scheduledDateDisplay: scheduleParts.date,
    scheduledTimeDisplay: scheduleParts.time,
    timezoneLabel: formatTimezoneLabel(timezone),
    participantsReady: areBothMatchParticipantsReady(slotA, slotB),
    matchResolved,
    editable: canSuperAdminEditMatch(row.status),
    editableParticipants: canSuperAdminEditMatchParticipants(row.status),
    editableSchedule: canSuperAdminEditMatchSchedule(row.status),
  };
}

async function loadParticipantDisplayMap(
  participantIds: string[],
): Promise<Map<string, ParticipantDisplayInfo>> {
  const map = new Map<string, ParticipantDisplayInfo>();
  if (participantIds.length === 0) return map;

  const db = getDb();
  const rows = await db
    .select({
      participantId: tournamentParticipants.id,
      publicCode: tournamentParticipants.publicCode,
      gamerTag: registrationApplications.gamerTag,
      username: participantAccounts.username,
      identityVerificationStatus: registrationApplications.identityVerificationStatus,
      podNumber: qualificationPods.podNumber,
      positionNumber: qualificationPodMembers.positionNumber,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .leftJoin(
      participantAccounts,
      eq(registrationApplications.participantAccountId, participantAccounts.id),
    )
    .leftJoin(
      qualificationPodMembers,
      eq(qualificationPodMembers.participantId, tournamentParticipants.id),
    )
    .leftJoin(
      qualificationPods,
      eq(qualificationPodMembers.podId, qualificationPods.id),
    )
    .where(inArray(tournamentParticipants.id, participantIds));

  for (const row of rows) {
    map.set(row.participantId, {
      participantId: row.participantId,
      publicCode: row.publicCode,
      gamerTag: row.gamerTag,
      username: row.username,
      verified: row.identityVerificationStatus === "verified",
      podNumber: row.podNumber,
      positionNumber: row.positionNumber,
    });
  }

  return map;
}

async function loadDependencyMatchMap(
  matchIds: string[],
): Promise<Map<string, DependencyMatchInfo>> {
  const map = new Map<string, DependencyMatchInfo>();
  if (matchIds.length === 0) return map;

  const db = getDb();
  const rows = await db
    .select({
      id: matches.id,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      bracketSlotIndex: matches.bracketSlotIndex,
    })
    .from(matches)
    .where(inArray(matches.id, matchIds));

  for (const row of rows) {
    map.set(row.id, row);
  }

  return map;
}

export async function getAdminMatchProjection(
  matchId: string,
): Promise<AdminMatchProjection | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: matches.id,
      tournamentId: matches.tournamentId,
      status: matches.status,
      schedulingStatus: matches.schedulingStatus,
      scheduledAt: matches.scheduledAt,
      timezone: matches.timezone,
      slotAType: matches.slotAType,
      slotBType: matches.slotBType,
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      dependsOnMatchAId: matches.dependsOnMatchAId,
      dependsOnMatchBId: matches.dependsOnMatchBId,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      bracketSlotIndex: matches.bracketSlotIndex,
      phaseName: tournamentPhases.name,
      phaseSlug: tournamentPhases.slug,
      podNumber: qualificationPods.podNumber,
      knockoutRoundName: knockoutRounds.name,
    })
    .from(matches)
    .innerJoin(tournamentPhases, eq(matches.phaseId, tournamentPhases.id))
    .leftJoin(qualificationPods, eq(matches.qualificationPodId, qualificationPods.id))
    .leftJoin(knockoutRounds, eq(matches.knockoutRoundId, knockoutRounds.id))
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!row) return null;

  const participantIds = [row.participantAId, row.participantBId].filter(
    (id): id is string => Boolean(id),
  );
  const dependencyIds = [row.dependsOnMatchAId, row.dependsOnMatchBId].filter(
    (id): id is string => Boolean(id),
  );

  const participantMap = await loadParticipantDisplayMap(participantIds);
  const dependencyMap = await loadDependencyMatchMap(dependencyIds);

  return projectAdminMatchRow(row, participantMap, dependencyMap);
}

/** Selected tournament participants eligible for SUPER_ADMIN match editing. */
export async function listMatchEditableParticipants(tournamentId: string) {
  const db = getDb();
  const rows = await db
    .select({
      participantId: tournamentParticipants.id,
      publicCode: tournamentParticipants.publicCode,
      gamerTag: registrationApplications.gamerTag,
      username: participantAccounts.username,
      identityVerificationStatus: registrationApplications.identityVerificationStatus,
      podNumber: qualificationPods.podNumber,
      positionNumber: qualificationPodMembers.positionNumber,
      status: tournamentParticipants.status,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .leftJoin(
      participantAccounts,
      eq(registrationApplications.participantAccountId, participantAccounts.id),
    )
    .leftJoin(
      qualificationPodMembers,
      eq(qualificationPodMembers.participantId, tournamentParticipants.id),
    )
    .leftJoin(
      qualificationPods,
      eq(qualificationPodMembers.podId, qualificationPods.id),
    )
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.status, "selected"),
      ),
    )
    .orderBy(tournamentParticipants.publicCode);

  return rows.map((row) => ({
    participantId: row.participantId,
    publicCode: row.publicCode,
    gamerTag: row.gamerTag,
    username: row.username,
    verified: row.identityVerificationStatus === "verified",
    podNumber: row.podNumber,
    positionNumber: row.positionNumber,
  }));
}
