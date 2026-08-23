/**
 * Finalized KG926 qualification rules — kg926-v1
 * Single-elimination pods: 128 → 32 pods × 4 → 32 qualifiers
 */

import { KG926_ELIGIBILITY_RULES_VERSION } from "@/server/tournament/eligibility/eligibility-types";

export const KG926_COMPETITION_RULES_VERSION = KG926_ELIGIBILITY_RULES_VERSION;

export const KG926_QUALIFICATION_POD_COUNT = 32;
export const KG926_QUALIFICATION_POSITIONS_PER_POD = 4;
export const KG926_QUALIFICATION_TARGET = 32;
export const KG926_QUALIFICATION_ENTRANTS = 128;
export const KG926_MAX_MATCHES_PER_NORMAL_POD = 3;
export const KG926_MAX_QUALIFICATION_MATCHES = 96;

export type TieResolutionPolicy = "pending" | "admin_resolution";

export interface QualificationHostRuleConfig {
  enabled: boolean;
  autoAdvanceAgainstHost: boolean;
  hostIsNotParticipant: boolean;
}

export interface QualificationRulesConfig {
  format: "single_elimination_pods";
  podCount: number;
  positionsPerPod: number;
  qualifiersPerPod: number;
  maxMatchesPerNormalPod: number;
  maxQualificationMatches: number;
  targetEntrants: number;
  qualificationTarget: number;
  assignmentMode: "manual";
  hostRule: QualificationHostRuleConfig;
  /** PENDING PRODUCT DECISION — draw/tie resolution mechanism */
  tieResolution: TieResolutionPolicy;
}

export interface CompetitionRulesConfig {
  rulesVersion: string;
  qualification: QualificationRulesConfig;
  knockout: {
    seeding: "pending";
    pairing: "pending";
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
    format: "single_elimination_pods",
    podCount: KG926_QUALIFICATION_POD_COUNT,
    positionsPerPod: KG926_QUALIFICATION_POSITIONS_PER_POD,
    qualifiersPerPod: 1,
    maxMatchesPerNormalPod: KG926_MAX_MATCHES_PER_NORMAL_POD,
    maxQualificationMatches: KG926_MAX_QUALIFICATION_MATCHES,
    targetEntrants: KG926_QUALIFICATION_ENTRANTS,
    qualificationTarget: KG926_QUALIFICATION_TARGET,
    assignmentMode: "manual",
    hostRule: {
      enabled: true,
      autoAdvanceAgainstHost: true,
      hostIsNotParticipant: true,
    },
    tieResolution: "pending",
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

export function parseCompetitionRules(raw: unknown): CompetitionRulesConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_KG926_COMPETITION_RULES;
  }
  const obj = raw as Partial<CompetitionRulesConfig>;
  const q = obj.qualification as Partial<QualificationRulesConfig> | undefined;
  return {
    rulesVersion: obj.rulesVersion ?? DEFAULT_KG926_COMPETITION_RULES.rulesVersion,
    qualification: {
      ...DEFAULT_KG926_COMPETITION_RULES.qualification,
      ...(q ?? {}),
      format: "single_elimination_pods",
      podCount: q?.podCount ?? KG926_QUALIFICATION_POD_COUNT,
      positionsPerPod: q?.positionsPerPod ?? KG926_QUALIFICATION_POSITIONS_PER_POD,
      qualifiersPerPod: 1,
      maxMatchesPerNormalPod: KG926_MAX_MATCHES_PER_NORMAL_POD,
      maxQualificationMatches: KG926_MAX_QUALIFICATION_MATCHES,
      targetEntrants: KG926_QUALIFICATION_ENTRANTS,
      qualificationTarget: KG926_QUALIFICATION_TARGET,
      assignmentMode: "manual",
      hostRule: {
        ...DEFAULT_KG926_COMPETITION_RULES.qualification.hostRule,
        ...(q?.hostRule ?? {}),
      },
      tieResolution: q?.tieResolution === "admin_resolution" ? "admin_resolution" : "pending",
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

/** @deprecated Step 7 boundary — qualification pairing is now finalized as pod single-elimination */
export function isQualificationPairingConfigured(_rules: CompetitionRulesConfig): boolean {
  return true;
}

/** @deprecated Step 7 boundary — advancement is pod-winner based */
export function isQualificationAdvancementConfigured(_rules: CompetitionRulesConfig): boolean {
  return true;
}
