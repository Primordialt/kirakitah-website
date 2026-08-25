import type { EligibilityReasonCode } from "@/server/tournament/eligibility/eligibility-reasons";
import type { SocialPlatform } from "@/config/social";

/** Single source of truth for current KG926 eligibility rules version. */
export const KG926_ELIGIBILITY_RULES_VERSION = "kg926-v3" as const;

/**
 * Configurable tournament eligibility requirements.
 * Defaults marked false/null reflect unresolved Product Owner decisions.
 */
export interface TournamentEligibilityRulesConfig {
  minimumAge: number;
  /** PO decision pending — default false */
  emailVerificationRequired: boolean;
  /** PO decision pending — default false */
  phoneVerificationRequired: boolean;
  /** PO decision pending — when true, application must reach approvedApplicationStatus */
  applicationApprovedRequired: boolean;
  /** Maps to registration_applications.status — currently `verified` (not `approved`) */
  approvedApplicationStatus: "verified" | "under_review" | "received";
  identityVerifiedRequired: boolean;
  requireGuardianForMinors: boolean;
  /**
   * When true, all required official social platforms must be manually verified
   * before the applicant is eligible for tournament participant selection.
   */
  socialFollowingRequired: boolean;
  /** KG926 required follow platforms (config-driven; extensible). */
  requiredSocialPlatforms: readonly SocialPlatform[];
}

export interface EligibilityEvaluationResult {
  eligible: boolean;
  reasons: EligibilityReasonCode[];
  rulesVersion: string;
  evaluatedRequirements: Record<string, boolean | string | number | null>;
  tournamentId: string;
  applicationId: string;
  applicationReference: string;
}

export type RegistrationWindowState = "open" | "closed" | "not_yet_open";
