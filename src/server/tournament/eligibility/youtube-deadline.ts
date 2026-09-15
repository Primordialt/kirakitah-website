import type { SocialPlatform } from "@/config/social";
import { TOURNAMENT_DEFAULT_TIMEZONE } from "@/server/tournament/scheduling/timezone";
import type { TournamentEligibilityRulesConfig } from "@/server/tournament/eligibility/eligibility-types";

export type YouTubeVerificationDeadlineState = "unset" | "pending" | "passed";

/**
 * Resolve whether a configured YouTube verification deadline has passed.
 * Deadlines are stored as UTC ISO instants representing the end of a WAT wall-clock minute.
 */
export function resolveYouTubeVerificationDeadlineState(
  deadline: string | null | undefined,
  now: Date = new Date(),
): YouTubeVerificationDeadlineState {
  if (!deadline) return "unset";
  const deadlineMs = Date.parse(deadline);
  if (Number.isNaN(deadlineMs)) return "unset";
  return now.getTime() > deadlineMs ? "passed" : "pending";
}

export function getYouTubeVerificationDeadlineFromConfig(
  config: TournamentEligibilityRulesConfig,
): string | null {
  return config.youtubeVerificationDeadline ?? null;
}

export function isYouTubeVerified(status: string | null | undefined): boolean {
  return status === "verified";
}

export function isYouTubeOnlySocialGap(input: {
  socialFollowStatus: string;
  youtubeVerificationStatus: string;
  requiredPlatforms: readonly SocialPlatform[];
  platformStatuses: Readonly<Record<string, string>>;
}): boolean {
  if (input.socialFollowStatus === "verified") return false;
  if (input.youtubeVerificationStatus === "rejected") return false;
  if (isYouTubeVerified(input.youtubeVerificationStatus)) return false;

  for (const platform of input.requiredPlatforms) {
    if (platform === "youtube") continue;
    const status = input.platformStatuses[platform];
    if (status !== "verified") return false;
  }

  return true;
}

export const YOUTUBE_VERIFICATION_TIMEZONE = TOURNAMENT_DEFAULT_TIMEZONE;
