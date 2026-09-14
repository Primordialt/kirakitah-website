import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { participantAuditEvents } from "@/server/db/schema";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import { resolveParticipantTournamentContext } from "@/server/participant/tournament-context";
import { attestYouTubeSubscription } from "@/server/registration/social-follow";
import { KG926_ELIGIBILITY_RULES_VERSION } from "@/server/tournament/eligibility/eligibility-types";

export class YouTubeSubscriptionAttestationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "ALREADY_VERIFIED"
      | "RATE_LIMITED"
      | "FORBIDDEN",
  ) {
    super(message);
    this.name = "YouTubeSubscriptionAttestationError";
  }
}

const ATTESTATION_LIMIT_PER_DAY = 10;

export async function submitYouTubeSubscriptionAttestation(input: {
  accountId: string;
  tournamentId: string;
  youtubeChannel?: string;
}): Promise<{ socialFollowStatus: string }> {
  const ctx = await resolveParticipantTournamentContext(
    input.accountId,
    input.tournamentId,
  );

  if (!ctx.application) {
    throw new YouTubeSubscriptionAttestationError(
      "No application found for this tournament.",
      "NOT_FOUND",
    );
  }

  const db = getDb();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [recentAttestations] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participantAuditEvents)
    .where(
      and(
        eq(participantAuditEvents.accountId, input.accountId),
        eq(
          participantAuditEvents.eventType,
          "PARTICIPANT_YOUTUBE_SUBSCRIPTION_ATTESTED",
        ),
        gte(participantAuditEvents.createdAt, oneDayAgo),
      ),
    );

  if ((recentAttestations?.count ?? 0) >= ATTESTATION_LIMIT_PER_DAY) {
    throw new YouTubeSubscriptionAttestationError(
      "Too many attestation attempts. Please try again later.",
      "RATE_LIMITED",
    );
  }

  try {
    const result = await attestYouTubeSubscription({
      applicationId: ctx.application.id,
      youtubeChannel: input.youtubeChannel,
    });

    await recordParticipantAuditEvent({
      eventType: "PARTICIPANT_YOUTUBE_SUBSCRIPTION_ATTESTED",
      accountId: input.accountId,
      metadata: {
        applicationReference: ctx.application.referenceId,
        rulesVersion: KG926_ELIGIBILITY_RULES_VERSION,
        channelProvided: Boolean(input.youtubeChannel?.trim()),
      },
    });

    return { socialFollowStatus: result.socialFollowStatus };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "YouTube subscription is already verified."
    ) {
      throw new YouTubeSubscriptionAttestationError(
        "YouTube subscription is already verified.",
        "ALREADY_VERIFIED",
      );
    }
    throw error;
  }
}
