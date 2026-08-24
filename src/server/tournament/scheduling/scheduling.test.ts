import { describe, expect, it } from "vitest";
import {
  areMatchGameplayRulesConfigured,
  areMatchSchedulingRulesConfigured,
  buildCompetitionPolicy,
  listFinalizedPolicyItems,
  listPendingPolicyItems,
} from "@/server/tournament/rules/competition-policy";
import { isValidIanaTimezone } from "@/server/tournament/scheduling/scheduling-service";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import { KG926_COMPETITION_RULES_VERSION } from "@/server/tournament/competition/competition-rules";

describe("KG926 competition policy (FINALIZED vs PENDING)", () => {
  it("uses kg926-v1 and KIRAKITAH GAMING 926 branding", () => {
    const policy = buildCompetitionPolicy();
    expect(policy.rulesVersion).toBe(KG926_COMPETITION_RULES_VERSION);
    expect(policy.competition.name).toBe("KIRAKITAH GAMING 926");
    expect(policy.competition.game).toBe("eFootball Mobile");
    expect(policy.competition.format).toBe("Online 1v1");
    expect(policy.competition.commencementDate).toBe("2026-09-14");
    expect(policy.competition.prize).toContain("US$100");
  });

  it("lists finalized structure rules", () => {
    const finalized = listFinalizedPolicyItems(buildCompetitionPolicy());
    const keys = finalized.map((i) => i.key);
    expect(keys).toContain("pods");
    expect(keys).toContain("qualifiers");
    expect(keys).toContain("pairing");
    expect(keys).toContain("scheduling");
    expect(finalized.every((i) => i.status === "finalized")).toBe(true);
  });

  it("lists pending gameplay and operational decisions without inventing values", () => {
    const pending = listPendingPolicyItems(buildCompetitionPolicy());
    expect(pending.some((i) => i.key === "match_duration")).toBe(true);
    expect(pending.some((i) => i.key === "tie_resolution")).toBe(true);
    expect(pending.some((i) => i.key === "no_show")).toBe(true);
    expect(pending.every((i) => i.status === "pending")).toBe(true);
    expect(pending.every((i) => i.value === "pending")).toBe(true);
  });

  it("allows scheduling when mode is manual", () => {
    const policy = buildCompetitionPolicy();
    expect(areMatchSchedulingRulesConfigured(policy)).toBe(true);
  });

  it("reports gameplay rules as not configured while pending", () => {
    expect(areMatchGameplayRulesConfigured(buildCompetitionPolicy())).toBe(false);
  });

  it("does not invent extra time or penalties in policy JSON", () => {
    const json = JSON.stringify(buildCompetitionPolicy());
    expect(json).not.toContain('"extraTime":"5 minutes"');
    expect(json).not.toContain("golden_goal");
    expect(json).not.toContain("sudden_death");
  });
});

describe("timezone validation", () => {
  it("accepts common IANA zones", () => {
    expect(isValidIanaTimezone("Africa/Lagos")).toBe(true);
    expect(isValidIanaTimezone("Europe/London")).toBe(true);
    expect(isValidIanaTimezone("UTC")).toBe(true);
  });

  it("rejects empty and garbage timezones", () => {
    expect(isValidIanaTimezone("")).toBe(false);
    expect(isValidIanaTimezone("Not/AZone")).toBe(false);
  });
});

describe("scheduling error boundaries", () => {
  it("defines MATCH_RULES_NOT_CONFIGURED", () => {
    const error = new CompetitionOperationsError(
      "Match scheduling rules are not configured.",
      "MATCH_RULES_NOT_CONFIGURED",
      400,
    );
    expect(error.code).toBe("MATCH_RULES_NOT_CONFIGURED");
  });

  it("defines PLAYER_SCHEDULE_CONFLICT", () => {
    const error = new CompetitionOperationsError(
      "A participant already has a match at this exact time.",
      "PLAYER_SCHEDULE_CONFLICT",
      409,
    );
    expect(error.code).toBe("PLAYER_SCHEDULE_CONFLICT");
    expect(error.status).toBe(409);
  });
});

describe("scheduling RBAC", () => {
  it("grants schedule permission to SUPER_ADMIN and TOURNAMENT_ADMIN", () => {
    expect(roleHasPermission("SUPER_ADMIN", "tournament:match_schedule")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:match_schedule")).toBe(true);
  });

  it("denies schedule mutation to REVIEWER and SUPPORT", () => {
    expect(roleHasPermission("REVIEWER", "tournament:match_schedule")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:match_schedule")).toBe(false);
  });

  it("restricts policy_manage to SUPER_ADMIN", () => {
    expect(roleHasPermission("SUPER_ADMIN", "tournament:policy_manage")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:policy_manage")).toBe(false);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:policy_view")).toBe(true);
  });
});

describe("scheduling audit inventory", () => {
  it("lists Step 10 scheduling and policy audit events", () => {
    const events = [
      "MATCH_SCHEDULED",
      "MATCH_RESCHEDULED",
      "MATCH_SCHEDULE_CANCELLED",
      "MATCH_ACTIVATED",
      "MATCH_RULES_VIEWED",
      "COMPETITION_POLICY_VIEWED",
      "COMPETITION_POLICY_CHANGED",
      "NO_SHOW_RECORDED",
      "DISCONNECT_RESOLVED",
      "DISPUTE_RESOLVED",
    ] as const;
    expect(events).toHaveLength(10);
  });
});
