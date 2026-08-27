import { and, desc, eq, inArray, or } from "drizzle-orm";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { getDb } from "@/server/db";
import {
  matchNotificationEvents,
  matchResults,
  matches,
  qualificationPodMembers,
  qualificationPods,
  registrationApplications,
  registrationSocialFollows,
  tournamentParticipants,
  tournamentPhases,
  tournaments,
} from "@/server/db/schema";
import { getProfileApplicationBlock } from "@/server/participant/application-gate";
import { getParticipantProfile } from "@/server/participant/profile/service";
import {
  resolveParticipantTournamentContext,
  type ParticipantTournamentContext,
} from "@/server/participant/tournament-context";
import { assertNoSensitivePublicFields } from "@/server/tournament/competition/public-projections";
import { evaluateRegistrationEligibilityByReference } from "@/server/tournament/eligibility/eligibility-service";
import { formatEligibilitySummary } from "@/server/tournament/participant-service";
import { getPodDetail } from "@/server/tournament/qualification/pod-service";
import {
  getPlayerSafeUpcomingMatch,
  type PlayerSafeMatchProjection,
} from "@/server/tournament/scheduling/player-match-projection";
import {
  formatInTimezone,
  formatTimezoneLabel,
  TOURNAMENT_DEFAULT_TIMEZONE,
} from "@/server/tournament/scheduling/timezone";
import {
  getApplicationStatusPresentation,
  getEligibilityPresentation,
  getIdentityStatusPresentation,
  getNotificationPresentation,
  getSelectionPresentation,
  getSocialAggregatePresentation,
  getSocialPlatformPresentation,
  PLATFORM_LABELS,
} from "@/lib/participant/tournament-status";

export type ParticipantApplicationView = {
  referenceId: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  submittedAt: string;
  identityStatus: string;
  identityLabel: string;
  socialFollowStatus: string;
  socialLabel: string;
  phoneVerificationStatus: string;
  socialPlatforms: Array<{
    platform: string;
    platformLabel: string;
    status: string;
    label: string;
  }>;
};

export type ParticipantTournamentSummary = {
  tournamentId: string;
  name: string;
  slug: string;
  game: string;
  status: string;
  hasApplication: boolean;
  applicationStatus: string | null;
  applicationStatusLabel: string | null;
  selected: boolean;
  publicCode: string | null;
  participantStatus: string | null;
};

export type ParticipantPodMemberView = {
  positionNumber: number;
  publicCode: string | null;
  gamerTag: string;
  isYou: boolean;
};

export type ParticipantPodView = {
  podNumber: number;
  podStatus: string;
  yourPosition: number | null;
  members: ParticipantPodMemberView[];
};

export type ParticipantMatchView = {
  matchId: string;
  phase: string;
  podNumber: number | null;
  roundLabel: string;
  opponentPublicCode: string | null;
  opponentGamerTag: string | null;
  scheduledAt: string | null;
  scheduledDisplay: string;
  timezone: string;
  timezoneLabel: string;
  matchStatus: string;
  schedulingStatus: string;
  yourScore: number | null;
  opponentScore: number | null;
  resultLabel: string;
};

export type ParticipantNotificationView = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  tournamentId: string;
  matchId: string;
  createdAt: string;
};

export type ParticipantTournamentExperience = {
  tournament: {
    id: string;
    slug: string;
    name: string;
    game: string;
    edition: string;
    status: string;
  };
  profileGate: {
    canApply: boolean;
    message: string | null;
    code: string | null;
  };
  application: ParticipantApplicationView | null;
  eligibility: {
    state: "ELIGIBLE" | "NOT_ELIGIBLE";
    label: string;
    description: string;
  } | null;
  selection: {
    status: string;
    label: string;
    description: string;
    publicCode: string | null;
  } | null;
  qualification: ParticipantPodView | null;
  upcomingMatch: PlayerSafeMatchProjection | null;
};

function toApplicationView(
  application: NonNullable<ParticipantTournamentContext["application"]>,
  socialRows: Array<{
    platform: string;
    verificationStatus: string;
  }>,
): ParticipantApplicationView {
  const appPresentation = getApplicationStatusPresentation(application.status);
  const identityPresentation = getIdentityStatusPresentation(
    application.identityVerificationStatus,
  );
  const socialPresentation = getSocialAggregatePresentation(
    application.socialFollowStatus,
  );

  return {
    referenceId: application.referenceId,
    status: application.status,
    statusLabel: appPresentation.label,
    statusDescription: appPresentation.description,
    submittedAt: application.createdAt,
    identityStatus: application.identityVerificationStatus,
    identityLabel: identityPresentation.label,
    socialFollowStatus: application.socialFollowStatus,
    socialLabel: socialPresentation.label,
    phoneVerificationStatus: application.phoneVerificationStatus,
    socialPlatforms: socialRows.map((row) => {
      const platformPresentation = getSocialPlatformPresentation(
        row.verificationStatus,
      );
      return {
        platform: row.platform,
        platformLabel: PLATFORM_LABELS[row.platform] ?? row.platform,
        status: row.verificationStatus,
        label: platformPresentation.label,
      };
    }),
  };
}

export async function listParticipantTournamentSummaries(
  accountId: string,
): Promise<ParticipantTournamentSummary[]> {
  const db = getDb();
  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, TOURNAMENT_EVENT_ID));

  const summaries: ParticipantTournamentSummary[] = [];

  for (const tournament of tournamentRows) {
    const ctx = await resolveParticipantTournamentContext(
      accountId,
      tournament.id,
    );
    const appPresentation = ctx.application
      ? getApplicationStatusPresentation(ctx.application.status)
      : null;
    const selectionPresentation = ctx.tournamentParticipant
      ? getSelectionPresentation(ctx.tournamentParticipant.status)
      : null;

    summaries.push({
      tournamentId: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      game: tournament.game,
      status: tournament.status,
      hasApplication: Boolean(ctx.application),
      applicationStatus: ctx.application?.status ?? null,
      applicationStatusLabel: appPresentation?.label ?? null,
      selected: ctx.tournamentParticipant?.status === "selected",
      publicCode: ctx.publicCode,
      participantStatus: selectionPresentation?.label ?? null,
    });
  }

  return summaries;
}

export async function getParticipantTournamentExperience(
  accountId: string,
  tournamentId: string,
): Promise<ParticipantTournamentExperience | null> {
  const ctx = await resolveParticipantTournamentContext(accountId, tournamentId);
  if (!ctx.tournament) return null;

  const profile = await getParticipantProfile(accountId);
  const block = getProfileApplicationBlock(
    profile.status,
    profile.correctionReason,
  );

  let applicationView: ParticipantApplicationView | null = null;
  let eligibilityView: ParticipantTournamentExperience["eligibility"] = null;
  let selectionView: ParticipantTournamentExperience["selection"] = null;
  let qualificationView: ParticipantPodView | null = null;
  let upcomingMatch: PlayerSafeMatchProjection | null = null;

  if (ctx.application) {
    const db = getDb();
    const socialRows = await db
      .select({
        platform: registrationSocialFollows.platform,
        verificationStatus: registrationSocialFollows.verificationStatus,
      })
      .from(registrationSocialFollows)
      .where(eq(registrationSocialFollows.applicationId, ctx.application.id));

    applicationView = toApplicationView(ctx.application, socialRows);

    const evaluation = await evaluateRegistrationEligibilityByReference(
      tournamentId,
      ctx.application.referenceId,
    );
    if (evaluation) {
      const summary = formatEligibilitySummary(evaluation);
      const eligibilityPresentation = getEligibilityPresentation(summary.state);
      eligibilityView = {
        state: summary.state,
        label: eligibilityPresentation.label,
        description: eligibilityPresentation.description,
      };
    }
  }

  if (ctx.tournamentParticipant) {
    const selectionPresentation = getSelectionPresentation(
      ctx.tournamentParticipant.status,
    );
    selectionView = {
      status: ctx.tournamentParticipant.status,
      label: selectionPresentation.label,
      description: selectionPresentation.description,
      publicCode: ctx.publicCode,
    };

    if (ctx.participantId && ctx.tournamentParticipant.status === "selected") {
      upcomingMatch = await getPlayerSafeUpcomingMatch({
        tournamentId,
        participantId: ctx.participantId,
      });

      const db = getDb();
      const [membership] = await db
        .select({
          podId: qualificationPodMembers.podId,
          positionNumber: qualificationPodMembers.positionNumber,
          podNumber: qualificationPods.podNumber,
          podStatus: qualificationPods.status,
        })
        .from(qualificationPodMembers)
        .innerJoin(
          qualificationPods,
          eq(qualificationPodMembers.podId, qualificationPods.id),
        )
        .where(eq(qualificationPodMembers.participantId, ctx.participantId))
        .limit(1);

      if (membership) {
        const podDetail = await getPodDetail(membership.podId);
        if (podDetail) {
          qualificationView = {
            podNumber: membership.podNumber,
            podStatus: membership.podStatus,
            yourPosition: membership.positionNumber,
            members: podDetail.members.map((member) => ({
              positionNumber: member.positionNumber,
              publicCode: member.publicCode,
              gamerTag: member.gamerTag,
              isYou: member.participantId === ctx.participantId,
            })),
          };
        }
      }
    }
  }

  const experience: ParticipantTournamentExperience = {
    tournament: {
      id: ctx.tournament.id,
      slug: ctx.tournament.slug,
      name: ctx.tournament.name,
      game: ctx.tournament.game,
      edition: ctx.tournament.edition,
      status: ctx.tournament.status,
    },
    profileGate: {
      canApply: !block && !ctx.application,
      message: block?.message ?? null,
      code: block?.code ?? null,
    },
    application: applicationView,
    eligibility: eligibilityView,
    selection: selectionView,
    qualification: qualificationView,
    upcomingMatch,
  };

  assertNoSensitivePublicFields({ ...experience } as Record<string, unknown>);
  return experience;
}

export async function listParticipantMatches(
  accountId: string,
  tournamentId: string,
): Promise<ParticipantMatchView[]> {
  const ctx = await resolveParticipantTournamentContext(accountId, tournamentId);
  if (!ctx.participantId) return [];

  const db = getDb();
  const participantId = ctx.participantId;

  const rows = await db
    .select({
      matchId: matches.id,
      phaseName: tournamentPhases.name,
      podNumber: qualificationPods.podNumber,
      qualificationRound: matches.qualificationRound,
      semifinalIndex: matches.semifinalIndex,
      participantAId: matches.participantAId,
      participantBId: matches.participantBId,
      scheduledAt: matches.scheduledAt,
      timezone: matches.timezone,
      status: matches.status,
      schedulingStatus: matches.schedulingStatus,
      authoritativeResultId: matches.authoritativeResultId,
    })
    .from(matches)
    .innerJoin(tournamentPhases, eq(matches.phaseId, tournamentPhases.id))
    .leftJoin(qualificationPods, eq(matches.qualificationPodId, qualificationPods.id))
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        or(
          eq(matches.participantAId, participantId),
          eq(matches.participantBId, participantId),
        ),
      ),
    )
    .orderBy(desc(matches.scheduledAt), desc(matches.createdAt));

  const opponentIds = rows
    .map((row) =>
      row.participantAId === participantId
        ? row.participantBId
        : row.participantAId,
    )
    .filter((id): id is string => Boolean(id));

  const opponentMap = new Map<
    string,
    { publicCode: string | null; gamerTag: string }
  >();

  if (opponentIds.length > 0) {
    const opponents = await db
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
      .where(inArray(tournamentParticipants.id, opponentIds));

    for (const opp of opponents) {
      opponentMap.set(opp.id, {
        publicCode: opp.publicCode,
        gamerTag: opp.gamerTag,
      });
    }
  }

  const resultIds = rows
    .map((row) => row.authoritativeResultId)
    .filter((id): id is string => Boolean(id));

  const resultMap = new Map<
    string,
    {
      participantAScore: number;
      participantBScore: number;
      isDraw: boolean;
    }
  >();

  if (resultIds.length > 0) {
    const results = await db
      .select({
        id: matchResults.id,
        participantAScore: matchResults.participantAScore,
        participantBScore: matchResults.participantBScore,
        isDraw: matchResults.isDraw,
      })
      .from(matchResults)
      .where(inArray(matchResults.id, resultIds));

    for (const result of results) {
      resultMap.set(result.id, {
        participantAScore: result.participantAScore,
        participantBScore: result.participantBScore,
        isDraw: result.isDraw,
      });
    }
  }

  return rows.map((row) => {
    const opponentId =
      row.participantAId === participantId
        ? row.participantBId
        : row.participantAId;
    const opponent = opponentId ? opponentMap.get(opponentId) : null;
    const timezone = row.timezone ?? TOURNAMENT_DEFAULT_TIMEZONE;
    const result = row.authoritativeResultId
      ? resultMap.get(row.authoritativeResultId)
      : null;

    let yourScore: number | null = null;
    let opponentScore: number | null = null;
    let resultLabel = "Result pending";

    if (result) {
      const youAreA = row.participantAId === participantId;
      yourScore = youAreA ? result.participantAScore : result.participantBScore;
      opponentScore = youAreA
        ? result.participantBScore
        : result.participantAScore;
      resultLabel = result.isDraw
        ? "Draw"
        : `${yourScore} – ${opponentScore}`;
    } else if (row.status === "cancelled") {
      resultLabel = "Cancelled";
    }

    const view: ParticipantMatchView = {
      matchId: row.matchId,
      phase: row.phaseName,
      podNumber: row.podNumber,
      roundLabel: row.qualificationRound
        ? `${row.qualificationRound}${row.semifinalIndex ? ` ${row.semifinalIndex}` : ""}`
        : row.phaseName,
      opponentPublicCode: opponent?.publicCode ?? null,
      opponentGamerTag: opponent?.gamerTag ?? null,
      scheduledAt: row.scheduledAt,
      scheduledDisplay: row.scheduledAt
        ? formatInTimezone(row.scheduledAt, timezone)
        : "Not scheduled",
      timezone,
      timezoneLabel: formatTimezoneLabel(timezone),
      matchStatus: row.status,
      schedulingStatus: row.schedulingStatus,
      yourScore,
      opponentScore,
      resultLabel,
    };

    assertNoSensitivePublicFields({ ...view });
    return view;
  });
}

export async function listParticipantNotifications(
  accountId: string,
  tournamentId?: string,
): Promise<ParticipantNotificationView[]> {
  const db = getDb();

  const applicationQuery = db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(eq(registrationApplications.participantAccountId, accountId));

  const applications = await applicationQuery;
  if (applications.length === 0) return [];

  const appIds = applications.map((row) => row.id);
  const participants = await db
    .select({ id: tournamentParticipants.id })
    .from(tournamentParticipants)
    .where(inArray(tournamentParticipants.applicationId, appIds));

  const participantIds = participants.map((row) => row.id);
  if (participantIds.length === 0) return [];

  const conditions = [
    inArray(matchNotificationEvents.recipientParticipantId, participantIds),
  ];
  if (tournamentId) {
    conditions.push(eq(matchNotificationEvents.tournamentId, tournamentId));
  }

  const rows = await db
    .select({
      id: matchNotificationEvents.id,
      eventType: matchNotificationEvents.eventType,
      tournamentId: matchNotificationEvents.tournamentId,
      matchId: matchNotificationEvents.matchId,
      createdAt: matchNotificationEvents.createdAt,
    })
    .from(matchNotificationEvents)
    .where(and(...conditions))
    .orderBy(desc(matchNotificationEvents.createdAt))
    .limit(50);

  return rows.map((row) => {
    const presentation = getNotificationPresentation(row.eventType);
    return {
      id: row.id,
      eventType: row.eventType,
      title: presentation.title,
      description: presentation.description,
      tournamentId: row.tournamentId,
      matchId: row.matchId,
      createdAt: row.createdAt,
    };
  });
}
