import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { eligibilityConfigHistory, tournaments } from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { parseEligibilityRules } from "@/server/tournament/eligibility/eligibility-rules";
import {
  getYouTubeVerificationDeadlineFromConfig,
  resolveYouTubeVerificationDeadlineState,
  YOUTUBE_VERIFICATION_TIMEZONE,
} from "@/server/tournament/eligibility/youtube-deadline";
import {
  formatScheduleInAfricaLagos,
  parseLocalDateTimeInTimezone,
} from "@/server/tournament/scheduling/timezone";

export class EligibilityConfigError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "EligibilityConfigError";
    this.code = code;
    this.status = status;
  }
}

export async function getEligibilityConfigView(
  tournamentId: string,
  options?: {
    actorId?: string;
    actorRole?: AdminRole;
    requestId?: string;
    recordViewAudit?: boolean;
    now?: Date;
  },
) {
  const db = getDb();
  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      eligibilityRulesVersion: tournaments.eligibilityRulesVersion,
      eligibilityRules: tournaments.eligibilityRules,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    throw new EligibilityConfigError("Tournament not found.", "NOT_FOUND", 404);
  }

  const { rulesVersion, config } = parseEligibilityRules(
    tournament.eligibilityRules,
    tournament.eligibilityRulesVersion,
  );
  const deadlineAt = getYouTubeVerificationDeadlineFromConfig(config);
  const deadlineState = resolveYouTubeVerificationDeadlineState(
    deadlineAt,
    options?.now,
  );

  if (options?.recordViewAudit && options.actorId && options.actorRole) {
    await recordAdminAuditEvent({
      eventType: "TOURNAMENT_ELIGIBILITY_CONFIG_VIEWED",
      actorId: options.actorId,
      actorRole: options.actorRole,
      requestId: options.requestId,
      metadata: {
        tournamentId,
        rulesVersion,
        deadlineConfigured: Boolean(deadlineAt),
      },
    });
  }

  return {
    tournamentId,
    tournamentName: tournament.name,
    rulesVersion,
    timezone: YOUTUBE_VERIFICATION_TIMEZONE,
    youtubeVerificationDeadline: deadlineAt,
    youtubeVerificationDeadlineDisplay: deadlineAt
      ? formatScheduleInAfricaLagos(deadlineAt)
      : null,
    deadlineState,
  };
}

export async function listEligibilityConfigHistory(tournamentId: string) {
  const db = getDb();
  return db
    .select({
      id: eligibilityConfigHistory.id,
      rulesVersion: eligibilityConfigHistory.rulesVersion,
      previousDeadline: eligibilityConfigHistory.previousDeadline,
      newDeadline: eligibilityConfigHistory.newDeadline,
      changeReason: eligibilityConfigHistory.changeReason,
      changedBy: eligibilityConfigHistory.changedBy,
      effectiveAt: eligibilityConfigHistory.effectiveAt,
    })
    .from(eligibilityConfigHistory)
    .where(eq(eligibilityConfigHistory.tournamentId, tournamentId))
    .orderBy(desc(eligibilityConfigHistory.effectiveAt));
}

function parseDeadlineInput(input: {
  deadlineDate?: string | null;
  deadlineTime?: string | null;
  clearDeadline?: boolean;
}): string | null {
  if (input.clearDeadline) return null;
  if (!input.deadlineDate && !input.deadlineTime) {
    throw new EligibilityConfigError(
      "Provide deadline date and time, or clear the deadline.",
      "VALIDATION_ERROR",
      400,
    );
  }
  if (!input.deadlineDate || !input.deadlineTime) {
    throw new EligibilityConfigError(
      "Both deadline date and time are required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  return parseLocalDateTimeInTimezone({
    date: input.deadlineDate,
    time: input.deadlineTime,
    timezone: YOUTUBE_VERIFICATION_TIMEZONE,
  });
}

/**
 * SUPER_ADMIN only. Updates the YouTube verification deadline in tournament eligibility rules.
 */
export async function updateYouTubeVerificationDeadline(input: {
  tournamentId: string;
  deadlineDate?: string | null;
  deadlineTime?: string | null;
  clearDeadline?: boolean;
  reason: string;
  actorId: string;
  actorRole: AdminRole;
  requestId?: string;
}) {
  if (input.actorRole !== "SUPER_ADMIN") {
    throw new EligibilityConfigError(
      "Only SUPER_ADMIN may configure the YouTube verification deadline.",
      "FORBIDDEN",
      403,
    );
  }

  const reason = input.reason.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (reason.length < 8) {
    throw new EligibilityConfigError(
      "Configuration change reason is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const newDeadline = parseDeadlineInput(input);
  const db = getDb();
  const [tournament] = await db
    .select({
      id: tournaments.id,
      eligibilityRulesVersion: tournaments.eligibilityRulesVersion,
      eligibilityRules: tournaments.eligibilityRules,
    })
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);

  if (!tournament) {
    throw new EligibilityConfigError("Tournament not found.", "NOT_FOUND", 404);
  }

  const { rulesVersion, config } = parseEligibilityRules(
    tournament.eligibilityRules,
    tournament.eligibilityRulesVersion,
  );
  const previousDeadline = getYouTubeVerificationDeadlineFromConfig(config);

  if (previousDeadline === newDeadline) {
    throw new EligibilityConfigError(
      "The requested deadline is unchanged.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const updatedRules = {
    ...(typeof tournament.eligibilityRules === "object" &&
    tournament.eligibilityRules !== null
      ? (tournament.eligibilityRules as Record<string, unknown>)
      : {}),
    youtubeVerificationDeadline: newDeadline,
  };

  await db
    .update(tournaments)
    .set({
      eligibilityRules: updatedRules,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tournaments.id, input.tournamentId));

  const [historyRow] = await db
    .insert(eligibilityConfigHistory)
    .values({
      tournamentId: input.tournamentId,
      rulesVersion,
      previousDeadline,
      newDeadline,
      changeReason: reason,
      changedBy: input.actorId,
    })
    .returning({ id: eligibilityConfigHistory.id });

  await recordAdminAuditEvent({
    eventType: "TOURNAMENT_ELIGIBILITY_CONFIG_CHANGED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      tournamentId: input.tournamentId,
      historyId: historyRow.id,
      rulesVersion,
      previousDeadlineConfigured: Boolean(previousDeadline),
      newDeadlineConfigured: Boolean(newDeadline),
    },
  });

  return {
    historyId: historyRow.id,
    rulesVersion,
    youtubeVerificationDeadline: newDeadline,
    youtubeVerificationDeadlineDisplay: newDeadline
      ? formatScheduleInAfricaLagos(newDeadline)
      : null,
    deadlineState: resolveYouTubeVerificationDeadlineState(newDeadline),
  };
}
