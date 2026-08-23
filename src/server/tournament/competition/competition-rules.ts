/**
 * Finalized KG926 competition rules — kg926-v1
 * Qualification: single-elimination pods
 * Knockout: single-elimination Top 32 with manual R32 pairing
 */

import { KG926_ELIGIBILITY_RULES_VERSION } from "@/server/tournament/eligibility/eligibility-types";

export const KG926_COMPETITION_RULES_VERSION = KG926_ELIGIBILITY_RULES_VERSION;

export const KG926_QUALIFICATION_POD_COUNT = 32;
export const KG926_QUALIFICATION_POSITIONS_PER_POD = 4;
export const KG926_QUALIFICATION_TARGET = 32;
export const KG926_QUALIFICATION_ENTRANTS = 128;
export const KG926_MAX_MATCHES_PER_NORMAL_POD = 3;
export const KG926_MAX_QUALIFICATION_MATCHES = 96;

export const KG926_KNOCKOUT_ENTRANTS = 32;
export const KG926_R32_MATCH_COUNT = 16;
export const KG926_R16_MATCH_COUNT = 8;
export const KG926_QF_MATCH_COUNT = 4;
export const KG926_SF_MATCH_COUNT = 2;
export const KG926_FINAL_MATCH_COUNT = 1;
export const KG926_KNOCKOUT_MATCH_COUNT = 31;

export type TieResolutionPolicy = "pending" | "admin_resolution";
export type KnockoutPairingStrategy = "manual" | "pending";
export type KnockoutSchedulingMode = "manual" | "pending";

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

export interface KnockoutRulesConfig {
  format: "single_elimination";
  entrantCount: number;
  /** FINALIZED PRODUCT RULE — only manual pairing is operational */
  pairing: KnockoutPairingStrategy;
  /** PENDING PRODUCT DECISION — seeding methodology beyond manual pairing */
  seeding: "pending";
  /** FINALIZED boundary — no automatic scheduler; manual only */
  scheduling: KnockoutSchedulingMode;
  /** PENDING PRODUCT DECISION — draw/tie resolution */
  tieResolution: TieResolutionPolicy;
  rounds: Array<
    | "round_of_32"
    | "round_of_16"
    | "quarterfinal"
    | "semifinal"
    | "grand_final"
  >;
}

export interface CompetitionRulesConfig {
  rulesVersion: string;
  qualification: QualificationRulesConfig;
  knockout: KnockoutRulesConfig;
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
    format: "single_elimination",
    entrantCount: KG926_KNOCKOUT_ENTRANTS,
    pairing: "manual",
    seeding: "pending",
    scheduling: "manual",
    tieResolution: "pending",
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
  const k = obj.knockout as Partial<KnockoutRulesConfig> | undefined;
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
      ...(k ?? {}),
      format: "single_elimination",
      entrantCount: KG926_KNOCKOUT_ENTRANTS,
      pairing: k?.pairing === "pending" ? "pending" : "manual",
      seeding: "pending",
      scheduling: k?.scheduling === "pending" ? "pending" : "manual",
      tieResolution: k?.tieResolution === "admin_resolution" ? "admin_resolution" : "pending",
      rounds: k?.rounds ?? DEFAULT_KG926_COMPETITION_RULES.knockout.rounds,
    },
  };
}

export function isKnockoutPairingConfigured(rules: CompetitionRulesConfig): boolean {
  return rules.knockout.pairing === "manual";
}

/** @deprecated Step 7 boundary — qualification pairing is now finalized as pod single-elimination */
export function isQualificationPairingConfigured(_rules: CompetitionRulesConfig): boolean {
  return true;
}

/** @deprecated Step 7 boundary — advancement is pod-winner based */
export function isQualificationAdvancementConfigured(_rules: CompetitionRulesConfig): boolean {
  return true;
}
