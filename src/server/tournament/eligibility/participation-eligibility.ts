import type { EligibilityReasonCode } from "@/server/tournament/eligibility/eligibility-reasons";
import type { TournamentEligibilityRulesConfig } from "@/server/tournament/eligibility/eligibility-types";
import {
  getYouTubeVerificationDeadlineFromConfig,
  isYouTubeOnlySocialGap,
  isYouTubeVerified,
  resolveYouTubeVerificationDeadlineState,
  type YouTubeVerificationDeadlineState,
} from "@/server/tournament/eligibility/youtube-deadline";

export type ParticipationEligibilityState =
  | "NOT_APPLICABLE"
  | "OK"
  | "ACTION_REQUIRED"
  | "BLOCKED";

export interface ParticipationEligibilityResult {
  state: ParticipationEligibilityState;
  canProceed: boolean;
  reasons: EligibilityReasonCode[];
  deadlineState: YouTubeVerificationDeadlineState;
  deadlineAt: string | null;
  graceApplies: boolean;
  youtubeVerificationStatus: string;
}

export function evaluateParticipationEligibility(input: {
  participantStatus: string | null;
  youtubeVerificationStatus: string;
  socialFollowStatus: string;
  platformStatuses: Readonly<Record<string, string>>;
  config: TournamentEligibilityRulesConfig;
  now?: Date;
}): ParticipationEligibilityResult {
  const now = input.now ?? new Date();
  const deadlineAt = getYouTubeVerificationDeadlineFromConfig(input.config);
  const deadlineState = resolveYouTubeVerificationDeadlineState(deadlineAt, now);

  if (input.participantStatus !== "selected") {
    return {
      state: "NOT_APPLICABLE",
      canProceed: true,
      reasons: [],
      deadlineState,
      deadlineAt,
      graceApplies: false,
      youtubeVerificationStatus: input.youtubeVerificationStatus,
    };
  }

  if (input.socialFollowStatus === "rejected") {
    return {
      state: "BLOCKED",
      canProceed: false,
      reasons: ["SOCIAL_FOLLOWING_REJECTED"],
      deadlineState,
      deadlineAt,
      graceApplies: false,
      youtubeVerificationStatus: input.youtubeVerificationStatus,
    };
  }

  if (isYouTubeVerified(input.youtubeVerificationStatus)) {
    return {
      state: "OK",
      canProceed: true,
      reasons: [],
      deadlineState,
      deadlineAt,
      graceApplies: false,
      youtubeVerificationStatus: input.youtubeVerificationStatus,
    };
  }

  const youtubeOnlyGap = isYouTubeOnlySocialGap({
    socialFollowStatus: input.socialFollowStatus,
    youtubeVerificationStatus: input.youtubeVerificationStatus,
    requiredPlatforms: input.config.requiredSocialPlatforms,
    platformStatuses: input.platformStatuses,
  });

  if (!youtubeOnlyGap) {
    return {
      state: "BLOCKED",
      canProceed: false,
      reasons: ["SOCIAL_FOLLOWING_NOT_VERIFIED"],
      deadlineState,
      deadlineAt,
      graceApplies: false,
      youtubeVerificationStatus: input.youtubeVerificationStatus,
    };
  }

  if (deadlineState === "passed") {
    return {
      state: "BLOCKED",
      canProceed: false,
      reasons: ["YOUTUBE_VERIFICATION_DEADLINE_PASSED"],
      deadlineState,
      deadlineAt,
      graceApplies: false,
      youtubeVerificationStatus: input.youtubeVerificationStatus,
    };
  }

  return {
    state: "ACTION_REQUIRED",
    canProceed: true,
    reasons: [],
    deadlineState,
    deadlineAt,
    graceApplies: true,
    youtubeVerificationStatus: input.youtubeVerificationStatus,
  };
}
