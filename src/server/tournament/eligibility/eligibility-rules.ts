import {
  REQUIRED_SOCIAL_PLATFORMS,
  type RequiredKg926SocialPlatform,
  type SocialPlatform,
} from "@/config/social";
import {
  KG926_ELIGIBILITY_RULES_VERSION,
  type TournamentEligibilityRulesConfig,
} from "@/server/tournament/eligibility/eligibility-types";

/** Default KG926 eligibility configuration (kg926-v3). */
export const DEFAULT_KG926_ELIGIBILITY_RULES: TournamentEligibilityRulesConfig = {
  minimumAge: 10,
  emailVerificationRequired: false,
  phoneVerificationRequired: false,
  applicationApprovedRequired: true,
  approvedApplicationStatus: "verified",
  identityVerifiedRequired: true,
  requireGuardianForMinors: true,
  socialFollowingRequired: true,
  requiredSocialPlatforms: [...REQUIRED_SOCIAL_PLATFORMS],
};

function parseRequiredPlatforms(raw: unknown): readonly SocialPlatform[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_KG926_ELIGIBILITY_RULES.requiredSocialPlatforms;
  }
  const allowed = new Set<string>(REQUIRED_SOCIAL_PLATFORMS);
  const parsed = raw.filter((value): value is RequiredKg926SocialPlatform => {
    return typeof value === "string" && allowed.has(value);
  });
  return parsed.length > 0
    ? parsed
    : DEFAULT_KG926_ELIGIBILITY_RULES.requiredSocialPlatforms;
}

export function parseEligibilityRules(
  raw: unknown,
  fallbackVersion: string = KG926_ELIGIBILITY_RULES_VERSION,
): { rulesVersion: string; config: TournamentEligibilityRulesConfig } {
  const base = DEFAULT_KG926_ELIGIBILITY_RULES;
  if (!raw || typeof raw !== "object") {
    return { rulesVersion: fallbackVersion, config: base };
  }
  const obj = raw as Partial<TournamentEligibilityRulesConfig> & {
    requiredSocialPlatforms?: unknown;
  };
  return {
    rulesVersion: fallbackVersion,
    config: {
      minimumAge: obj.minimumAge ?? base.minimumAge,
      emailVerificationRequired:
        obj.emailVerificationRequired ?? base.emailVerificationRequired,
      phoneVerificationRequired:
        obj.phoneVerificationRequired ?? base.phoneVerificationRequired,
      applicationApprovedRequired:
        obj.applicationApprovedRequired ?? base.applicationApprovedRequired,
      approvedApplicationStatus:
        obj.approvedApplicationStatus ?? base.approvedApplicationStatus,
      identityVerifiedRequired:
        obj.identityVerifiedRequired ?? base.identityVerifiedRequired,
      requireGuardianForMinors:
        obj.requireGuardianForMinors ?? base.requireGuardianForMinors,
      socialFollowingRequired:
        obj.socialFollowingRequired ?? base.socialFollowingRequired,
      requiredSocialPlatforms: parseRequiredPlatforms(obj.requiredSocialPlatforms),
    },
  };
}
