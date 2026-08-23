/**
 * Authoritative KG926 competition policy boundary — kg926-v1
 *
 * FINALIZED PRODUCT RULE vs PENDING PRODUCT DECISION are explicit.
 * Do not invent gameplay settings. Do not silently create kg926-v2.
 */

import {
  DEFAULT_KG926_COMPETITION_RULES,
  KG926_COMPETITION_RULES_VERSION,
  parseCompetitionRules,
  type CompetitionRulesConfig,
} from "@/server/tournament/competition/competition-rules";

export type PolicyDecisionStatus = "finalized" | "pending";

export interface PolicyItem {
  key: string;
  label: string;
  status: PolicyDecisionStatus;
  value: string | number | boolean | null;
}

/** PENDING PRODUCT DECISION — eFootball gameplay settings (not invented) */
export interface MatchGameplaySettingsConfig {
  matchDuration: "pending";
  gameMode: "pending";
  squadRestrictions: "pending";
  teamRestrictions: "pending";
  playerRestrictions: "pending";
  connectionRequirements: "pending";
  extraTime: "pending";
  penalties: "pending";
  substitutions: "pending";
  tacticalRestrictions: "pending";
  customSettings: "pending";
}

/** PENDING PRODUCT DECISION — operational policy placeholders (not activated) */
export interface OperationalPolicyConfig {
  noShowTiming: "pending";
  disconnectPolicy: "pending";
  forfeitPolicyDetails: "pending";
  disputeWindow: "pending";
  disputeEvidenceRequirements: "pending";
  disputeResolutionAuthority: "pending";
  replacementPolicy: "pending";
  minimumRestPeriod: "pending";
  publicBracketVisibility: "pending";
  publicResultVisibility: "pending";
  publicGamerTagPolicy: "pending";
  publicPhotoPolicy: "pending";
  prizeFulfilment: "admin_manual";
  resultSource: "admin";
  schedulingMode: "manual" | "pending";
  notificationDelivery: "pending";
}

export interface Kg926CompetitionPolicy {
  rulesVersion: string;
  competition: {
    name: "KIRAKITAH GAMING 926";
    game: "eFootball Mobile";
    format: "Online 1v1";
    commencementDate: "2026-09-14";
    prize: "US$100 Grand Prize";
    edition: "926";
  };
  structure: CompetitionRulesConfig;
  matchGameplay: MatchGameplaySettingsConfig;
  operational: OperationalPolicyConfig;
}

export const DEFAULT_KG926_COMPETITION_POLICY: Kg926CompetitionPolicy = {
  rulesVersion: KG926_COMPETITION_RULES_VERSION,
  competition: {
    name: "KIRAKITAH GAMING 926",
    game: "eFootball Mobile",
    format: "Online 1v1",
    commencementDate: "2026-09-14",
    prize: "US$100 Grand Prize",
    edition: "926",
  },
  structure: DEFAULT_KG926_COMPETITION_RULES,
  matchGameplay: {
    matchDuration: "pending",
    gameMode: "pending",
    squadRestrictions: "pending",
    teamRestrictions: "pending",
    playerRestrictions: "pending",
    connectionRequirements: "pending",
    extraTime: "pending",
    penalties: "pending",
    substitutions: "pending",
    tacticalRestrictions: "pending",
    customSettings: "pending",
  },
  operational: {
    noShowTiming: "pending",
    disconnectPolicy: "pending",
    forfeitPolicyDetails: "pending",
    disputeWindow: "pending",
    disputeEvidenceRequirements: "pending",
    disputeResolutionAuthority: "pending",
    replacementPolicy: "pending",
    minimumRestPeriod: "pending",
    publicBracketVisibility: "pending",
    publicResultVisibility: "pending",
    publicGamerTagPolicy: "pending",
    publicPhotoPolicy: "pending",
    prizeFulfilment: "admin_manual",
    resultSource: "admin",
    schedulingMode: "manual",
    notificationDelivery: "pending",
  },
};

export function buildCompetitionPolicy(
  competitionRulesRaw?: unknown,
): Kg926CompetitionPolicy {
  const structure = parseCompetitionRules(competitionRulesRaw);
  return {
    ...DEFAULT_KG926_COMPETITION_POLICY,
    rulesVersion: structure.rulesVersion,
    structure,
    operational: {
      ...DEFAULT_KG926_COMPETITION_POLICY.operational,
      schedulingMode: structure.knockout.scheduling === "manual" ? "manual" : "pending",
    },
  };
}

/** FINALIZED PRODUCT RULE items for admin display */
export function listFinalizedPolicyItems(policy: Kg926CompetitionPolicy): PolicyItem[] {
  return [
    { key: "name", label: "Competition name", status: "finalized", value: policy.competition.name },
    { key: "game", label: "Game", status: "finalized", value: policy.competition.game },
    { key: "format", label: "Format", status: "finalized", value: policy.competition.format },
    {
      key: "commencement",
      label: "Commencement",
      status: "finalized",
      value: policy.competition.commencementDate,
    },
    { key: "prize", label: "Prize", status: "finalized", value: policy.competition.prize },
    {
      key: "entrants",
      label: "Qualification entrants",
      status: "finalized",
      value: policy.structure.qualification.targetEntrants,
    },
    {
      key: "pods",
      label: "Qualification pods",
      status: "finalized",
      value: policy.structure.qualification.podCount,
    },
    {
      key: "positions",
      label: "Players per pod",
      status: "finalized",
      value: policy.structure.qualification.positionsPerPod,
    },
    {
      key: "qual_format",
      label: "Qualification format",
      status: "finalized",
      value: policy.structure.qualification.format,
    },
    {
      key: "qualifiers",
      label: "Qualifiers / Top 32",
      status: "finalized",
      value: policy.structure.qualification.qualificationTarget,
    },
    {
      key: "knockout_format",
      label: "Knockout format",
      status: "finalized",
      value: policy.structure.knockout.format,
    },
    {
      key: "knockout_rounds",
      label: "Knockout rounds",
      status: "finalized",
      value: policy.structure.knockout.rounds.join(" → "),
    },
    {
      key: "pairing",
      label: "R32 pairing",
      status: "finalized",
      value: policy.structure.knockout.pairing,
    },
    {
      key: "scheduling",
      label: "Scheduling mode",
      status: "finalized",
      value: policy.operational.schedulingMode,
    },
    {
      key: "result_source",
      label: "Operational result source",
      status: "finalized",
      value: policy.operational.resultSource,
    },
    {
      key: "prize_fulfilment",
      label: "Prize fulfilment",
      status: "finalized",
      value: policy.operational.prizeFulfilment,
    },
    {
      key: "rules_version",
      label: "Rules version",
      status: "finalized",
      value: policy.rulesVersion,
    },
  ];
}

/** PENDING PRODUCT DECISION items — never invent values */
export function listPendingPolicyItems(policy: Kg926CompetitionPolicy): PolicyItem[] {
  return [
    { key: "match_duration", label: "Match duration", status: "pending", value: policy.matchGameplay.matchDuration },
    { key: "game_mode", label: "Game mode", status: "pending", value: policy.matchGameplay.gameMode },
    { key: "squad", label: "Squad restrictions", status: "pending", value: policy.matchGameplay.squadRestrictions },
    { key: "team", label: "Team restrictions", status: "pending", value: policy.matchGameplay.teamRestrictions },
    { key: "player", label: "Player restrictions", status: "pending", value: policy.matchGameplay.playerRestrictions },
    { key: "connection", label: "Connection requirements", status: "pending", value: policy.matchGameplay.connectionRequirements },
    { key: "extra_time", label: "Extra time", status: "pending", value: policy.matchGameplay.extraTime },
    { key: "penalties", label: "Penalties", status: "pending", value: policy.matchGameplay.penalties },
    { key: "tie_resolution", label: "Tie resolution", status: "pending", value: policy.structure.knockout.tieResolution },
    { key: "seeding", label: "Knockout seeding", status: "pending", value: policy.structure.knockout.seeding },
    { key: "no_show", label: "No-show timing", status: "pending", value: policy.operational.noShowTiming },
    { key: "disconnect", label: "Disconnect policy", status: "pending", value: policy.operational.disconnectPolicy },
    { key: "forfeit_details", label: "Forfeit policy details", status: "pending", value: policy.operational.forfeitPolicyDetails },
    { key: "dispute_window", label: "Dispute window", status: "pending", value: policy.operational.disputeWindow },
    { key: "dispute_evidence", label: "Dispute evidence requirements", status: "pending", value: policy.operational.disputeEvidenceRequirements },
    { key: "replacement", label: "Replacement policy", status: "pending", value: policy.operational.replacementPolicy },
    { key: "rest", label: "Minimum rest period", status: "pending", value: policy.operational.minimumRestPeriod },
    { key: "public_bracket", label: "Public bracket visibility", status: "pending", value: policy.operational.publicBracketVisibility },
    { key: "public_results", label: "Public result visibility", status: "pending", value: policy.operational.publicResultVisibility },
    { key: "public_tags", label: "Public gamer-tag policy", status: "pending", value: policy.operational.publicGamerTagPolicy },
    { key: "public_photos", label: "Public photo policy", status: "pending", value: policy.operational.publicPhotoPolicy },
    { key: "notifications", label: "Notification delivery", status: "pending", value: policy.operational.notificationDelivery },
  ];
}

/**
 * Scheduling may proceed when operational scheduling mode is configured (manual).
 * Pending gameplay settings do NOT invent defaults and do not block scheduling a time.
 */
export function areMatchSchedulingRulesConfigured(policy: Kg926CompetitionPolicy): boolean {
  return policy.operational.schedulingMode === "manual";
}

/**
 * Gameplay settings remain PENDING — never invent duration/mode/etc.
 * Used to surface MATCH_RULES_NOT_CONFIGURED when an operation requires them.
 */
export function areMatchGameplayRulesConfigured(policy: Kg926CompetitionPolicy): boolean {
  return Object.values(policy.matchGameplay).every((v) => v !== "pending");
}

export function toPolicySnapshot(policy: Kg926CompetitionPolicy): Record<string, unknown> {
  return JSON.parse(JSON.stringify(policy)) as Record<string, unknown>;
}
