import {
  KG926_ELIGIBILITY_RULES_VERSION,
  type TournamentEligibilityRulesConfig,
} from "@/server/tournament/eligibility/eligibility-types";

/** Default KG926 eligibility configuration — PO decisions pending where noted. */
export const DEFAULT_KG926_ELIGIBILITY_RULES: TournamentEligibilityRulesConfig = {
  minimumAge: 10,
  emailVerificationRequired: false,
  phoneVerificationRequired: false,
  applicationApprovedRequired: true,
  approvedApplicationStatus: "verified",
  identityVerifiedRequired: true,
  requireGuardianForMinors: true,
};

export function parseEligibilityRules(
  raw: unknown,
  fallbackVersion: string = KG926_ELIGIBILITY_RULES_VERSION,
): { rulesVersion: string; config: TournamentEligibilityRulesConfig } {
  const base = DEFAULT_KG926_ELIGIBILITY_RULES;
  if (!raw || typeof raw !== "object") {
    return { rulesVersion: fallbackVersion, config: base };
  }
  const obj = raw as Partial<TournamentEligibilityRulesConfig>;
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
    },
  };
}
