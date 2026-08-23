/**
 * Competition rules configuration for KIRAKITAH GAMING 926.
 * Unresolved mechanics are explicitly marked pending — do not invent values.
 */

import { KG926_ELIGIBILITY_RULES_VERSION } from "@/server/tournament/eligibility/eligibility-types";

/** Competition operations share the same rules version lineage as eligibility. */
export const KG926_COMPETITION_RULES_VERSION = KG926_ELIGIBILITY_RULES_VERSION;

export type PendingMarker = "pending";

export interface CompetitionRulesConfig {
  rulesVersion: string;
  qualification: {
    /** PENDING PRODUCT DECISION — do not invent point values */
    scoring: PendingMarker;
    ranking: PendingMarker;
    tiebreakers: PendingMarker;
    pairing: PendingMarker;
    advancement: PendingMarker;
    targetEntrants: number;
    qualificationTarget: number;
  };
  knockout: {
    seeding: PendingMarker;
    pairing: PendingMarker;
    rounds: Array<
      | "round_of_32"
      | "round_of_16"
      | "quarterfinal"
      | "semifinal"
      | "grand_final"
    >;
  };
}

export const DEFAULT_KG926_COMPETITION_RULES: CompetitionRulesConfig = {
  rulesVersion: KG926_COMPETITION_RULES_VERSION,
  qualification: {
    scoring: "pending",
    ranking: "pending",
    tiebreakers: "pending",
    pairing: "pending",
    advancement: "pending",
    targetEntrants: 128,
    qualificationTarget: 32,
  },
  knockout: {
    seeding: "pending",
    pairing: "pending",
    rounds: [
      "round_of_32",
      "round_of_16",
      "quarterfinal",
      "semifinal",
      "grand_final",
    ],
  },
};

export function parseCompetitionRules(
  raw: unknown,
): CompetitionRulesConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_KG926_COMPETITION_RULES;
  }
  const obj = raw as Partial<CompetitionRulesConfig>;
  return {
    rulesVersion: obj.rulesVersion ?? DEFAULT_KG926_COMPETITION_RULES.rulesVersion,
    qualification: {
      ...DEFAULT_KG926_COMPETITION_RULES.qualification,
      ...(obj.qualification ?? {}),
      scoring: "pending",
      ranking: "pending",
      tiebreakers: "pending",
      pairing: "pending",
      advancement: "pending",
    },
    knockout: {
      ...DEFAULT_KG926_COMPETITION_RULES.knockout,
      ...(obj.knockout ?? {}),
      seeding: "pending",
      pairing: "pending",
      rounds:
        obj.knockout?.rounds ?? DEFAULT_KG926_COMPETITION_RULES.knockout.rounds,
    },
  };
}

export function isQualificationAdvancementConfigured(
  rules: CompetitionRulesConfig,
): boolean {
  return rules.qualification.advancement !== "pending";
}

export function isQualificationPairingConfigured(
  rules: CompetitionRulesConfig,
): boolean {
  return rules.qualification.pairing !== "pending";
}
